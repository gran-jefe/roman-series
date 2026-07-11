import { Express, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import multer from "multer";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { parseRecalledQuestionsDocument } from "../lib/recalledQuestionsParser";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

interface RecalledQuestionsDeps {
  supabaseAdmin: SupabaseClient;
  upload: multer.Multer;
}

export function registerRecalledQuestionsRoutes(app: Express, deps: RecalledQuestionsDeps) {
  const { supabaseAdmin, upload } = deps;

  // GET /api/recalled-questions - Get recalled questions (Elite only)
 app.get("/api/recalled-questions", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
   try {
     // Check subscription
     const { data: profile, error: profileError } = await supabaseAdmin
       .from("profiles")
       .select("subscription_status")
       .eq("id", req.userId)
       .single();

     if (profileError || !profile) {
       return res.status(404).json({
         status: "error",
         message: "Profile not found",
         timestamp: new Date().toISOString(),
       });
     }

     if (profile.subscription_status !== "elite") {
       return res.status(403).json({
         status: "error",
         message:
           "Recalled questions are available for Elite members only. Upgrade your plan to access this feature.",
         timestamp: new Date().toISOString(),
       });
     }

     const { subject_id, year } = req.query;

     let query = supabaseAdmin
       .from("recalled_questions")
       .select("*")
       .order("question_number", { ascending: true });

     // Convert subject_id -> subject name
     if (subject_id) {
       const { data: subject, error: subjectError } = await supabaseAdmin
         .from("subjects")
         .select("name")
         .eq("id", subject_id as string)
         .single();

       if (subjectError || !subject) {
         return res.status(404).json({
           status: "error",
           message: "Subject not found",
           timestamp: new Date().toISOString(),
         });
       }

       query = query.eq("subject", subject.name);
     }

     if (year) {
       query = query.eq("year", Number(year));
     }

     const { data: questions, error } = await query;

     if (error) {
       console.error("[recalled-questions] Query error:", error);

       return res.status(500).json({
         status: "error",
         message: "Failed to fetch recalled questions",
         timestamp: new Date().toISOString(),
       });
     }

     return res.json({
       status: "success",
       data: {
         questions: questions ?? [],
         total: questions?.length ?? 0,
       },
       timestamp: new Date().toISOString(),
     });
   } catch (error) {
     console.error("[recalled-questions] Error:", error);

     return res.status(500).json({
       status: "error",
       message: "Internal server error",
       timestamp: new Date().toISOString(),
     });
   }
 });
  // POST /api/admin/recalled-questions - Upload recalled question (Admin only)
  app.post("/api/admin/recalled-questions", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can upload recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        subject,
        year,
        section_label,
        question_number,
        body,
        option_a,
        option_b,
        option_c,
        option_d,
        answer,
        note,
      } = req.body;

      if (!subject || !body) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: subject, body",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (answer && !OPTION_LETTERS.includes(answer)) {
        res.status(400).json({
          status: "error",
          message: "answer must be one of A, B, C, D (or omitted if not yet known)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const hasOptions = Boolean(option_a || option_b || option_c || option_d);

      const { data: question, error: createError } = await supabaseAdmin
        .from("recalled_questions")
        .insert({
          subject,
          year: year || null,
          section_label: section_label || null,
          question_number: question_number || null,
          body,
          option_a: option_a || null,
          option_b: option_b || null,
          option_c: option_c || null,
          option_d: option_d || null,
          answer: answer || null,
          has_options: hasOptions,
          note: note || null,
        })
        .select()
        .single();

      if (createError || !question) {
        console.error("[admin/recalled-questions] Create error:", createError);
        res.status(500).json({
          status: "error",
          message: "Failed to create recalled question",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(201).json({
        status: "success",
        data: {
          question_id: question.id,
          message: "Recalled question created successfully",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/recalled-questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/recalled-questions - List recalled questions for admin
  app.get("/api/admin/recalled-questions", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can access this resource",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { subject, year, limit = "50", offset = "0" } = req.query;

      let query = supabaseAdmin
        .from("recalled_questions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (subject) {
        query = query.eq("subject", subject as string);
      }

      if (year) {
        query = query.eq("year", Number(year));
      }

      const { data: questions, error, count } = await query;

      if (error) {
        console.error("[admin/recalled-questions] Query error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          questions: questions || [],
          total: count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/recalled-questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/admin/recalled-questions/:id - Update recalled question
  app.patch("/api/admin/recalled-questions/:id", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can update recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const {
        subject,
        year,
        section_label,
        question_number,
        body,
        option_a,
        option_b,
        option_c,
        option_d,
        answer,
        note,
      } = req.body;

      if (answer !== undefined && answer && !OPTION_LETTERS.includes(answer)) {
        res.status(400).json({
          status: "error",
          message: "answer must be one of A, B, C, D (or null if not yet known)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateData: any = {};
      if (subject !== undefined) updateData.subject = subject;
      if (year !== undefined) updateData.year = year;
      if (section_label !== undefined) updateData.section_label = section_label;
      if (question_number !== undefined) updateData.question_number = question_number;
      if (body !== undefined) updateData.body = body;
      if (option_a !== undefined) updateData.option_a = option_a;
      if (option_b !== undefined) updateData.option_b = option_b;
      if (option_c !== undefined) updateData.option_c = option_c;
      if (option_d !== undefined) updateData.option_d = option_d;
      if (answer !== undefined) updateData.answer = answer;
      if (note !== undefined) updateData.note = note;

      const { data: question, error: updateError } = await supabaseAdmin
        .from("recalled_questions")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError || !question) {
        res.status(500).json({
          status: "error",
          message: "Failed to update recalled question",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: { question },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/recalled-questions/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/recalled-questions/:id - Delete recalled question
  app.delete("/api/admin/recalled-questions/:id", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can delete recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;

      const { error: deleteError } = await supabaseAdmin
        .from("recalled_questions")
        .delete()
        .eq("id", id);

      if (deleteError) {
        res.status(500).json({
          status: "error",
          message: "Failed to delete recalled question",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        message: "Recalled question deleted successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/recalled-questions/:id] Delete error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/recalled-questions/parse-docx - Step 1 of the Word-doc
  // upload flow: parses an uploaded .docx into the same JSON shape the bulk
  // endpoint below accepts. This never touches the database - it's a pure
  // text -> JSON conversion so the admin can review the parsed result (and
  // the list of anything that couldn't be parsed) before committing it via
  // POST /api/admin/recalled-questions/bulk.
  app.post(
    "/api/admin/recalled-questions/parse-docx",
    requireAuth(supabaseAdmin),
    upload.single("file"),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (req.userRole !== "admin") {
          res.status(403).json({
            status: "error",
            message: "Only admins can upload recalled questions",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!req.file) {
          res.status(400).json({
            status: "error",
            message: "No file provided",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const parsed = await parseRecalledQuestionsDocument(req.file.buffer);

        const questions = parsed.questions.map((q) => ({
          subject: q.subject,
          year: q.year,
          section_label: q.section_label,
          question_number: q.question_number,
          body: q.body,
          options: q.options.map((o) => ({ ...o, is_correct: false })),
        }));

        res.json({
          status: "success",
          data: {
            questions,
            total_parsed: parsed.total_parsed,
            skipped_no_options: parsed.skipped_no_options,
            errors: parsed.errors,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/recalled-questions/parse-docx] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // POST /api/admin/recalled-questions/bulk - Bulk-add recalled questions from
  // a JSON file. Every question here is a brand new INSERT - this never
  // deletes or replaces existing rows, so uploads always append to what's
  // already in the table.
  app.post("/api/admin/recalled-questions/bulk", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can upload recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        res.status(400).json({
          status: "error",
          message: "questions must be a non-empty array",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const label = `Question ${i + 1}`;

        try {
          if (!q.subject || typeof q.subject !== "string") {
            errors.push(`${label}: missing subject`);
            skipped++;
            continue;
          }
          if (!q.body || typeof q.body !== "string") {
            errors.push(`${label}: missing question body`);
            skipped++;
            continue;
          }
          if (!Array.isArray(q.options) || q.options.length < 2) {
            errors.push(`${label}: needs at least 2 options`);
            skipped++;
            continue;
          }
          if (q.options.length > OPTION_KEYS.length) {
            errors.push(
              `${label}: has ${q.options.length} options but recalled_questions only supports up to ${OPTION_KEYS.length} (A-D)`
            );
            skipped++;
            continue;
          }
          // 0 correct is allowed here (e.g. recalled questions imported from a
          // source with no answer key, to be marked up by an admin later) -
          // only more than one marked correct is actually invalid.
          const correctCount = q.options.filter((o: any) => o.is_correct).length;
          if (correctCount > 1) {
            errors.push(`${label}: at most one option can be marked is_correct`);
            skipped++;
            continue;
          }

          const optionColumns: Record<string, string | null> = {};
          let answer: string | null = null;
          q.options.forEach((o: any, idx: number) => {
            optionColumns[OPTION_KEYS[idx]] = o.body;
            if (o.is_correct) answer = OPTION_LETTERS[idx];
          });

          const { error: insertError } = await supabaseAdmin.from("recalled_questions").insert({
            subject: q.subject,
            year: q.year || null,
            section_label: q.section_label || null,
            question_number: q.question_number || null,
            body: q.body,
            ...optionColumns,
            answer,
            has_options: true,
          });

          if (insertError) {
            errors.push(`${label}: ${insertError.message}`);
            skipped++;
            continue;
          }

          created++;
        } catch (rowError) {
          errors.push(`${label}: ${rowError instanceof Error ? rowError.message : "unknown error"}`);
          skipped++;
        }
      }

      res.json({
        status: "success",
        data: { created, skipped, errors },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/recalled-questions/bulk] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
