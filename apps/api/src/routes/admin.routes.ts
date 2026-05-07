import { Express, Request, Response, NextFunction } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import multer from "multer";
import crypto from "crypto";
import { parseRomanSeriesDocument } from "../lib/questionParser";

interface AdminDeps {
  supabaseAdmin: SupabaseClient;
  upload: multer.Multer;
  uploadCache: Map<string, { parsed: any; expiresAt: number }>;
}

// Helper to check admin auth
async function checkAdminAuth(
  req: Request,
  res: Response,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      message: "Missing or invalid Authorization header",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    res.status(403).json({
      status: "error",
      message: "Admin access required",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return user.id;
}


export function registerAdminRoutes(app: Express, deps: AdminDeps) {
  const { supabaseAdmin, upload, uploadCache } = deps;

  console.log('[registerAdminRoutes] Registering admin routes...');
  console.log('[registerAdminRoutes] upload middleware available:', !!upload);
  console.log('[registerAdminRoutes] uploadCache available:', !!uploadCache);

  // GET /api/admin/stats
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    console.log('[GET /api/admin/stats] Called');
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [usersRes, sessionsRes, questionsRes, subscriptionsRes] =
        await Promise.all([
          supabaseAdmin.from("profiles").select("id"),
          supabaseAdmin
            .from("sessions")
            .select("id")
            .gte("started_at", today.toISOString()),
          supabaseAdmin.from("questions").select("id"),
          supabaseAdmin
            .from("subscriptions")
            .select("amount")
            .eq("status", "active")
            .gte("expires_at", new Date().toISOString()),
        ]);

      const newUsersRes = await supabaseAdmin
        .from("profiles")
        .select("id")
        .gte(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        );

      const totalRevenue =
        (subscriptionsRes.data?.reduce((sum, s: any) => sum + (s.amount || 0), 0) ||
          0) / 100;

      res.json({
        status: "success",
        data: {
          total_users: usersRes.data?.length || 0,
          sessions_today: sessionsRes.data?.length || 0,
          total_revenue: Math.round(totalRevenue),
          total_questions: questionsRes.data?.length || 0,
          new_users_this_week: newUsersRes.data?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/stats] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/users
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
      const search = (req.query.search as string) || "";

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, role, subscription_status, created_at, target_university_id");

      if (profilesError) throw profilesError;

      const { data: authUsers, error: authError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (authError) throw authError;

      const emailMap = new Map(
        authUsers.users.map((u: any) => [u.id, u.email])
      );

      const merged = (profiles || []).map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        email: emailMap.get(profile.id) || "N/A",
        role: profile.role || "user",
        subscription_status: profile.subscription_status,
        target_university_id: profile.target_university_id,
        created_at: profile.created_at,
      }));

      let filtered = merged;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = merged.filter(
          (u: any) =>
            u.full_name?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower)
        );
      }

      filtered.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = filtered.slice(start, end);

      res.json({
        status: "success",
        data: paginatedData,
        pagination: {
          page,
          limit,
          total: filtered.length,
          total_pages: Math.ceil(filtered.length / limit),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/users/:id
  app.patch("/api/admin/users/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { role, subscription_status } = req.body;

      const updateData: any = {};
      if (role) updateData.role = role;
      if (subscription_status) updateData.subscription_status = subscription_status;

      const { data } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/upload/docx
  app.post(
    "/api/admin/upload/docx",
    upload.single("file"),
    async (req: Request, res: Response) => {
      console.log('[admin/upload/docx] Handler called');

      const userId = await checkAdminAuth(req, res, supabaseAdmin);
      if (!userId) {
        console.log('[admin/upload/docx] Auth failed');
        return;
      }

      console.log('[admin/upload/docx] Auth passed, userId:', userId);

      try {
        if (!req.file) {
          console.log('[admin/upload/docx] No file provided');
          res.status(400).json({
            status: "error",
            message: "No file provided",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log('[admin/upload/docx] File received, size:', req.file.size);

        const { subject_id, university_id } = req.body;
        if (!subject_id || !university_id) {
          console.log('[admin/upload/docx] Missing subject_id or university_id');
          res.status(400).json({
            status: "error",
            message: "Missing subject_id or university_id",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log('[admin/upload/docx] Calling parseRomanSeriesDocument with buffer size:', req.file.buffer.length);
        const parseResult = await parseRomanSeriesDocument(req.file.buffer);
        console.log('[admin/upload/docx] Parse complete:', {
          total_parsed: parseResult.total_parsed,
          total_matched: parseResult.total_matched,
          total_unmatched: parseResult.total_unmatched,
        });

        const uploadToken = crypto.randomUUID();
        const ttl = 10 * 60 * 1000;
        uploadCache.set(uploadToken, {
          parsed: {
            questions: parseResult.questions,
            subject_id,
            university_id,
          },
          expiresAt: Date.now() + ttl,
        });

        res.json({
          status: "success",
          data: {
            preview: parseResult.questions.slice(0, 5),
            all_questions: parseResult.questions,
            topics: parseResult.topics,
            total_parsed: parseResult.total_parsed,
            total_matched: parseResult.total_matched,
            total_unmatched: parseResult.total_unmatched,
            errors: parseResult.errors,
            upload_token: uploadToken,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/upload/docx] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to parse document",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // POST /api/admin/upload/confirm
  app.post("/api/admin/upload/confirm", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { upload_token, subject_id, university_id } = req.body;

      if (!upload_token) {
        res.status(400).json({
          status: "error",
          message: "Missing upload_token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cached = uploadCache.get(upload_token);
      if (!cached || cached.expiresAt < Date.now()) {
        res.status(400).json({
          status: "error",
          message: "Upload token expired or invalid",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { questions } = cached.parsed;
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < questions.length; i += 20) {
        const batch = questions.slice(i, i + 20);

        for (const question of batch) {
          try {
            const hasCorrectAnswer = question.options.some((o: any) => o.is_correct);
            if (!hasCorrectAnswer) {
              skipped++;
              continue;
            }

            const { data: questionData, error: qError } = await supabaseAdmin
              .from("questions")
              .insert({
                subject_id,
                university_id,
                body: question.body,
                explanation: question.explanation,
              })
              .select()
              .single();

            if (qError) throw qError;

            const optionRows = question.options.map((o: any) => ({
              id: crypto.randomUUID(),
              question_id: questionData.id,
              label: o.label,
              body: o.body,
              is_correct: o.is_correct,
            }));

            const { error: oError } = await supabaseAdmin
              .from("options")
              .insert(optionRows);

            if (oError) throw oError;

            created++;
          } catch (error) {
            skipped++;
            errors.push(
              `Failed to save question: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }

      uploadCache.delete(upload_token);

      res.json({
        status: "success",
        data: {
          created,
          skipped,
          errors,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/upload/confirm] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/upload/manual
  app.post("/api/admin/upload/manual", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { subject_id, university_id, body, explanation, options } = req.body;

      if (!subject_id || !university_id || !body || !options) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const correctCount = options.filter((o: any) => o.is_correct).length;
      if (correctCount !== 1) {
        res.status(400).json({
          status: "error",
          message: "Exactly one option must be marked as correct",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: questionData, error: qError } = await supabaseAdmin
        .from("questions")
        .insert({
          subject_id,
          university_id,
          body,
          explanation: explanation || null,
        })
        .select()
        .single();

      if (qError) throw qError;

      const optionRows = options.map((o: any) => ({
        id: crypto.randomUUID(),
        question_id: questionData.id,
        label: o.label,
        body: o.body,
        is_correct: o.is_correct,
      }));

      const { error: oError } = await supabaseAdmin
        .from("options")
        .insert(optionRows);

      if (oError) throw oError;

      res.status(201).json({
        status: "success",
        data: {
          id: questionData.id,
          ...questionData,
          options: optionRows,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/upload/manual] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/questions/:id/answer
  app.patch("/api/admin/questions/:id/answer", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;
      const { answer_letter } = req.body;

      if (!answer_letter || !["A", "B", "C", "D", "E"].includes(answer_letter)) {
        res.status(400).json({
          status: "error",
          message: "Invalid answer_letter. Must be A, B, C, D, or E",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update question answer
      const { error: updateError } = await supabaseAdmin
        .from("questions")
        .update({ answer_letter })
        .eq("id", id);

      if (updateError) {
        res.status(400).json({
          status: "error",
          message: updateError.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all options for this question
      const { data: options, error: fetchError } = await supabaseAdmin
        .from("options")
        .select("id, label")
        .eq("question_id", id);

      if (fetchError || !options) {
        res.status(400).json({
          status: "error",
          message: "Failed to fetch options",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update is_correct for all options
      const updates = options.map((opt) => ({
        id: opt.id,
        is_correct: opt.label === answer_letter,
      }));

      for (const update of updates) {
        await supabaseAdmin
          .from("options")
          .update({ is_correct: update.is_correct })
          .eq("id", update.id);
      }

      res.json({
        status: "success",
        data: { question_id: id, answer_letter },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/:id/answer] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/questions/unanswered
  app.get("/api/admin/questions/unanswered", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select(`
          id,
          number,
          body,
          answer_letter,
          topic_id,
          topics(name, subject_id),
          subjects:topics(subjects(id, name)),
          options(id, label, body, is_correct)
        `)
        .is("answer_letter", null)
        .order("topics.subjects.name", { ascending: true })
        .order("topics.name", { ascending: true })
        .order("number", { ascending: true });

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: data || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/unanswered] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/questions - retrieve questions with filtering and pagination
  app.get("/api/admin/questions", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
      const subjectId = req.query.subjectId as string;
      const universityId = req.query.universityId as string;
      const year = req.query.year as string;

      let query = supabaseAdmin
        .from("questions")
        .select("*, topics(name), subjects(name), universities(name), options(id, label, body, is_correct)", { count: "exact" });

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }
      if (universityId) {
        query = query.eq("university_id", universityId);
      }
      if (year) {
        query = query.eq("year", parseInt(year));
      }

      const start = (page - 1) * limit;
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, start + limit - 1);

      if (error) throw error;

      res.json({
        status: "success",
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks/upload-json - Upload JSON cutoff marks
  app.post("/api/admin/cutoff-marks/upload-json", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { university, year, cutoff_marks } = req.body;

      // Validate required fields
      if (!university || !year || !Array.isArray(cutoff_marks) || cutoff_marks.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Invalid JSON structure. Required fields: university, year, cutoff_marks (array)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Resolve university ID from name
      const { data: uniData, error: uniError } = await supabaseAdmin
        .from("universities")
        .select("id")
        .ilike("name", university)
        .single();

      if (uniError || !uniData) {
        res.status(400).json({
          status: "error",
          message: `University not found: ${university}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const university_id = uniData.id;

      // Validate records
      for (const record of cutoff_marks) {
        if (!record.faculty || !record.course || record.merit === undefined || record.catch === undefined || record.elds === undefined) {
          res.status(400).json({
            status: "error",
            message: "Invalid record. Required fields per record: faculty, course, merit, catch, elds",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Deduplicate records by course only (constraint is on university_id, course, year)
      const courseMap = new Map<string, any>();
      for (const record of cutoff_marks) {
        // Keep first occurrence of each course
        if (!courseMap.has(record.course)) {
          courseMap.set(record.course, record);
        }
      }
      const deduplicatedRecords = Array.from(courseMap.values());
      console.log(`[admin/cutoff-marks/upload-json] Deduplicating by course: ${cutoff_marks.length} records → ${deduplicatedRecords.length} unique courses`);

      // Delete existing records for this university and year
      console.log(`[admin/cutoff-marks/upload-json] Deleting existing records: university_id=${university_id}, year=${year}`);
      const { error: deleteError, count: deleteCount } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("university_id", university_id)
        .eq("year", year);

      if (deleteError) {
        console.error("[admin/cutoff-marks/upload-json] Delete error:", deleteError);
        res.status(400).json({
          status: "error",
          message: `Failed to delete existing records: ${deleteError.message}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`[admin/cutoff-marks/upload-json] Delete completed, removed ${deleteCount} records`);

      // Batch insert in groups of 50
      let totalInserted = 0;
      for (let i = 0; i < deduplicatedRecords.length; i += 50) {
        const batch = deduplicatedRecords.slice(i, i + 50).map((r: any) => ({
          university_id,
          year,
          faculty: r.faculty,
          course: r.course,
          merit_cutoff: r.merit,
          catch_cutoff: r.catch,
          elds_cutoff: r.elds,
        }));

        console.log(`[admin/cutoff-marks/upload-json] Inserting batch ${Math.floor(i/50) + 1}: ${batch.length} records`);

        const { data, error } = await supabaseAdmin.from("cutoff_marks").insert(batch).select();

        if (error) {
          console.error("[admin/cutoff-marks/upload-json] Batch insert error:", error, "Batch:", batch);
          res.status(400).json({
            status: "error",
            message: `Batch insert failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`[admin/cutoff-marks/upload-json] Batch ${Math.floor(i/50) + 1} inserted successfully: ${data?.length || 0} records`);
        totalInserted += data?.length || 0;
      }

      res.json({
        status: "success",
        data: { inserted: totalInserted },
        message: `Successfully inserted ${totalInserted} cutoff marks`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks/upload-json] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks/bulk - Bulk insert cutoff marks
  app.post("/api/admin/cutoff-marks/bulk", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { university_id, year, records } = req.body;

      // Validate required fields
      if (!university_id || !year || !Array.isArray(records) || records.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: university_id, year, records (non-empty array)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Deduplicate records by course only (constraint is on university_id, course, year)
      const courseMap = new Map<string, any>();
      for (const record of records) {
        // Keep first occurrence of each course
        if (!courseMap.has(record.course)) {
          courseMap.set(record.course, record);
        }
      }
      const deduplicatedRecords = Array.from(courseMap.values());
      console.log(`[admin/cutoff-marks/bulk] Deduplicating by course: ${records.length} records → ${deduplicatedRecords.length} unique courses`);

      // Delete existing records for this university and year
      console.log(`[admin/cutoff-marks/bulk] Deleting existing records: university_id=${university_id}, year=${year}`);
      const { error: deleteError, count: deleteCount } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("university_id", university_id)
        .eq("year", year);

      if (deleteError) {
        console.error("[admin/cutoff-marks/bulk] Delete error:", deleteError);
        res.status(400).json({
          status: "error",
          message: `Failed to delete existing records: ${deleteError.message}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`[admin/cutoff-marks/bulk] Delete completed, removed ${deleteCount} records`);

      // Batch insert in groups of 50
      let totalInserted = 0;
      for (let i = 0; i < deduplicatedRecords.length; i += 50) {
        const batch = deduplicatedRecords.slice(i, i + 50).map((r: any) => ({
          university_id,
          year,
          faculty: r.faculty,
          course: r.course,
          merit_cutoff: r.merit,
          catch_cutoff: r.catch,
          elds_cutoff: r.elds,
        }));

        console.log(`[admin/cutoff-marks/bulk] Inserting batch ${Math.floor(i/50) + 1}: ${batch.length} records`);

        const { data, error } = await supabaseAdmin.from("cutoff_marks").insert(batch).select();

        if (error) {
          console.error("[admin/cutoff-marks/bulk] Batch insert error:", error, "Batch:", batch);
          res.status(400).json({
            status: "error",
            message: `Batch insert failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`[admin/cutoff-marks/bulk] Batch ${Math.floor(i/50) + 1} inserted successfully: ${data?.length || 0} records`);
        totalInserted += data?.length || 0;
      }

      res.json({
        status: "success",
        data: { inserted: totalInserted },
        message: `Successfully inserted ${totalInserted} cutoff marks`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks/bulk] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/cutoff-marks - List cutoff marks with filters
  app.get("/api/admin/cutoff-marks", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const universityId = req.query.universityId as string;
      const course = req.query.course as string;
      const year = req.query.year as string;

      let query = supabaseAdmin.from("cutoff_marks").select("*");

      if (universityId) {
        query = query.eq("university_id", universityId);
      }
      if (course) {
        query = query.eq("course", course);
      }
      if (year) {
        query = query.eq("year", parseInt(year));
      }

      const { data, error } = await query.order("year", { ascending: false });

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: data || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/cutoff-marks - Create a new cutoff mark
  app.post("/api/admin/cutoff-marks", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const {
        university_id,
        course,
        year,
        utme_cutoff,
        utme_weight,
        putme_weight,
        combined_cutoff,
        notes,
      } = req.body;

      // Validate required fields
      if (!university_id || !course || !year || utme_cutoff === undefined || combined_cutoff === undefined) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: university_id, course, year, utme_cutoff, combined_cutoff",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate numeric values
      if (typeof utme_cutoff !== "number" || typeof combined_cutoff !== "number") {
        res.status(400).json({
          status: "error",
          message: "utme_cutoff and combined_cutoff must be numbers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Insert into database
      const { data: cutoffMark, error: insertError } = await supabaseAdmin
        .from("cutoff_marks")
        .insert({
          university_id,
          course,
          year,
          utme_cutoff,
          utme_weight: utme_weight || 60,
          putme_weight: putme_weight || 40,
          combined_cutoff,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) {
        res.status(400).json({
          status: "error",
          message: insertError.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(201).json({
        status: "success",
        data: cutoffMark,
        message: "Cutoff mark created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks POST] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/cutoff-marks/:id - Delete a cutoff mark
  app.delete("/api/admin/cutoff-marks/:id", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const { id } = req.params;

      const { error: deleteError } = await supabaseAdmin
        .from("cutoff_marks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        res.status(400).json({
          status: "error",
          message: deleteError.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        message: "Cutoff mark deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/cutoff-marks DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
