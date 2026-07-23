import { Express, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

const OPTION_KEYS = ["option_a", "option_b", "option_c", "option_d", "option_e"] as const;
const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

interface BiologyFocusDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerBiologyFocusRoutes(app: Express, deps: BiologyFocusDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/biology-focus/content - Area of Concentration markdown (Elite only)
  app.get(
    "/api/biology-focus/content",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status")
          .eq("id", req.userId)
          .single();

        if (profileError || !profile) {
          res.status(404).json({
            status: "error",
            message: "Profile not found",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (profile.subscription_status !== "elite") {
          res.status(403).json({
            status: "error",
            message:
              "Biology: Plant Morphology Focus is available for Elite members only. Upgrade your plan to access this feature.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { data: content, error } = await supabaseAdmin
          .from("biology_focus_content")
          .select("*")
          .eq("section", "area_of_concentration")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[biology-focus/content] Query error:", error);
          res.status(500).json({
            status: "error",
            message: "Failed to fetch content",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          status: "success",
          data: { content: content?.content_markdown ?? "" },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[biology-focus/content] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // GET /api/biology-focus/questions - Question Bank (Elite only)
  app.get(
    "/api/biology-focus/questions",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status")
          .eq("id", req.userId)
          .single();

        if (profileError || !profile) {
          res.status(404).json({
            status: "error",
            message: "Profile not found",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (profile.subscription_status !== "elite") {
          res.status(403).json({
            status: "error",
            message:
              "Biology: Plant Morphology Focus is available for Elite members only. Upgrade your plan to access this feature.",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { section_name } = req.query;

        let query = supabaseAdmin
          .from("biology_qbank_questions")
          .select("*")
          .order("section_name", { ascending: true })
          .order("question_number", { ascending: true });

        if (section_name) {
          query = query.eq("section_name", section_name as string);
        }

        const { data: questions, error } = await query;

        if (error) {
          console.error("[biology-focus/questions] Query error:", error);
          res.status(500).json({
            status: "error",
            message: "Failed to fetch questions",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          status: "success",
          data: {
            questions: questions ?? [],
            total: questions?.length ?? 0,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[biology-focus/questions] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // GET /api/admin/biology-focus/content - Fetch current Area of Concentration
  // markdown for the admin editor (admin-only, no Elite check - admins must
  // be able to see/edit this content regardless of their own subscription).
  app.get(
    "/api/admin/biology-focus/content",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (req.userRole !== "admin") {
          res.status(403).json({
            status: "error",
            message: "Only admins can access this resource",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { data: content, error } = await supabaseAdmin
          .from("biology_focus_content")
          .select("*")
          .eq("section", "area_of_concentration")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[admin/biology-focus/content] Query error:", error);
          res.status(500).json({
            status: "error",
            message: "Failed to fetch content",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          status: "success",
          data: { content: content?.content_markdown ?? "" },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/biology-focus/content] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // POST /api/admin/biology-focus/content - Upsert Area of Concentration markdown (Admin only)
  app.post(
    "/api/admin/biology-focus/content",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (req.userRole !== "admin") {
          res.status(403).json({
            status: "error",
            message: "Only admins can upload focus content",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { content_markdown } = req.body;

        if (!content_markdown || typeof content_markdown !== "string") {
          res.status(400).json({
            status: "error",
            message: "Missing required field: content_markdown",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { error: insertError } = await supabaseAdmin
          .from("biology_focus_content")
          .insert({ section: "area_of_concentration", content_markdown });

        if (insertError) {
          console.error("[admin/biology-focus/content] Insert error:", insertError);
          res.status(500).json({
            status: "error",
            message: "Failed to save content",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(201).json({
          status: "success",
          data: { message: "Content saved successfully" },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/biology-focus/content] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // GET /api/admin/biology-focus/questions - List qbank questions for admin
  app.get(
    "/api/admin/biology-focus/questions",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (req.userRole !== "admin") {
          res.status(403).json({
            status: "error",
            message: "Only admins can access this resource",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { data: questions, error, count } = await supabaseAdmin
          .from("biology_qbank_questions")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) {
          console.error("[admin/biology-focus/questions] Query error:", error);
          res.status(500).json({
            status: "error",
            message: "Failed to fetch questions",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.json({
          status: "success",
          data: { questions: questions ?? [], total: count ?? 0 },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/biology-focus/questions] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // POST /api/admin/biology-focus/questions/bulk - Bulk-add qbank questions
  // from the {subject, topic, sections: [{name, questions: [...]}]} JSON
  // shape, same upload pattern as recalled questions. Every question here is
  // a brand new INSERT - appends to whatever's already in the table.
  app.post(
    "/api/admin/biology-focus/questions/bulk",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
        if (req.userRole !== "admin") {
          res.status(403).json({
            status: "error",
            message: "Only admins can upload questions",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const { sections } = req.body;

        if (!Array.isArray(sections) || sections.length === 0) {
          res.status(400).json({
            status: "error",
            message: "Body must include a non-empty 'sections' array",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const section of sections) {
          const sectionName = section?.name;
          const sectionQuestions = section?.questions;

          if (!sectionName || typeof sectionName !== "string") {
            errors.push("A section is missing its 'name'");
            continue;
          }
          if (!Array.isArray(sectionQuestions)) {
            errors.push(`${sectionName}: 'questions' must be an array`);
            continue;
          }

          for (let i = 0; i < sectionQuestions.length; i++) {
            const q = sectionQuestions[i];
            const label = `${sectionName} - Question ${i + 1}`;

            try {
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
                  `${label}: has ${q.options.length} options but the qbank only supports up to ${OPTION_KEYS.length} (A-E)`
                );
                skipped++;
                continue;
              }

              const correctCount = q.options.filter((o: any) => o.is_correct).length;
              if (correctCount !== 1) {
                errors.push(`${label}: exactly one option must be marked is_correct`);
                skipped++;
                continue;
              }

              const optionColumns: Record<string, string | null> = {};
              let answer: string | null = null;
              q.options.forEach((o: any, idx: number) => {
                optionColumns[OPTION_KEYS[idx]] = o.body;
                if (o.is_correct) answer = OPTION_LETTERS[idx];
              });

              const { error: insertError } = await supabaseAdmin
                .from("biology_qbank_questions")
                .insert({
                  section_name: sectionName,
                  question_number: q.question_number ?? i + 1,
                  body: q.body,
                  ...optionColumns,
                  answer,
                  explanation: q.explanation || null,
                });

              if (insertError) {
                errors.push(`${label}: ${insertError.message}`);
                skipped++;
                continue;
              }

              created++;
            } catch (rowError) {
              errors.push(
                `${label}: ${rowError instanceof Error ? rowError.message : "unknown error"}`
              );
              skipped++;
            }
          }
        }

        res.json({
          status: "success",
          data: { created, skipped, errors },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("[admin/biology-focus/questions/bulk] Error:", error);
        res.status(500).json({
          status: "error",
          message: "Internal server error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}
