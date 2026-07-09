import { Express, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

interface FlaggingDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerFlaggingRoutes(app: Express, deps: FlaggingDeps) {
  const { supabaseAdmin } = deps;

  // POST /api/flagging/flag - Flag a question
  app.post("/api/flagging/flag", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { question_id, session_id, reason } = req.body;

      if (!question_id) {
        res.status(400).json({
          status: "error",
          message: "question_id is required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Insert or update flagged question
      const { data, error } = await supabaseAdmin
        .from("flagged_questions")
        .upsert(
          {
            user_id: req.userId,
            question_id,
            session_id: session_id || null,
            reason: reason || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,question_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[flagging/flag] Database error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to flag question",
          details: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(201).json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[flagging/flag] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/flagging/flag/:question_id - Unflag a question
  app.delete("/api/flagging/flag/:question_id", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { question_id } = req.params;

      const { error } = await supabaseAdmin
        .from("flagged_questions")
        .delete()
        .eq("user_id", req.userId)
        .eq("question_id", question_id);

      if (error) {
        res.status(500).json({
          status: "error",
          message: "Failed to unflag question",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        status: "success",
        message: "Question unflagged",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[flagging/unflag] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/flagging/flags - Get user's flagged questions
  app.get("/api/flagging/flags", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("flagged_questions")
        .select("*")
        .eq("user_id", req.userId)
        .order("created_at", { ascending: false });

      if (error) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch flagged questions",
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
      console.error("[flagging/flags] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/flagging/flags/:question_id - Check if question is flagged by user
  app.get("/api/flagging/flags/:question_id", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { question_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("flagged_questions")
        .select("*")
        .eq("user_id", req.userId)
        .eq("question_id", question_id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is expected
        res.status(500).json({
          status: "error",
          message: "Failed to check flag status",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          is_flagged: !!data,
          flagged_question: data || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[flagging/check] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/admin/flagging/all - Admin: Get all flagged questions (with filters)
  app.get("/api/admin/flagging/all", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Admin access required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get query params for filtering
      const { user_id, question_id, limit = 100, offset = 0 } = req.query;

      let query = supabaseAdmin
        .from("flagged_questions")
        .select(
          `
          id,
          user_id,
          question_id,
          session_id,
          reason,
          created_at,
          updated_at,
          questions ( body, topic_name, subject_id )
        `,
          { count: "exact" }
        );

      if (user_id) {
        query = query.eq("user_id", user_id as string);
      }

      if (question_id) {
        query = query.eq("question_id", question_id as string);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(parseInt(offset as string) || 0, parseInt(offset as string) + parseInt(limit as string) - 1);

      if (error) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch flagged questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const rows = data || [];

      // flagged_questions.user_id references auth.users, not profiles directly,
      // so PostgREST can't embed it — resolve emails in a single batch query.
      const userIds = [...new Set(rows.map((r: any) => r.user_id))];
      const { data: profiles } = userIds.length
        ? await supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds)
        : { data: [] as any[] };
      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

      const enriched = rows.map((r: any) => ({
        ...r,
        flagger: profileById.get(r.user_id) || null,
      }));

      res.json({
        status: "success",
        data: enriched,
        count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/flagging/all] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/admin/flagging/:question_id - Admin: Resolve/clear all flags on a question
  app.delete("/api/admin/flagging/:question_id", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Admin access required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { question_id } = req.params;

      const { error } = await supabaseAdmin
        .from("flagged_questions")
        .delete()
        .eq("question_id", question_id);

      if (error) {
        res.status(500).json({
          status: "error",
          message: "Failed to resolve flagged question",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        message: "Question resolved and unflagged. It will reappear in mock exams.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/flagging/resolve] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
