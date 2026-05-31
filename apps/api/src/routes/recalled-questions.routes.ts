import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

interface RecalledQuestionsDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerRecalledQuestionsRoutes(app: Express, deps: RecalledQuestionsDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/recalled-questions - Get recalled questions (Elite only)
  app.get("/api/recalled-questions", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check user's subscription status
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        res.status(404).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Elite-only feature
      if (profile.subscription_status !== "elite") {
        res.status(403).json({
          status: "error",
          message: "Recalled questions are available for Elite members only. Upgrade your plan to access this feature.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        subject_id,
        university_id,
        year,
      } = req.query;

      let query = supabaseAdmin
        .from("recalled_questions")
        .select("*, recalled_question_options(*)")
        .order("created_at", { ascending: false });

      if (subject_id) {
        query = query.eq("subject_id", subject_id as string);
      }

      if (university_id) {
        query = query.eq("university_id", university_id as string);
      }

      if (year) {
        query = query.eq("year", parseInt(year as string));
      }

      const { data: questions, error } = await query;

      if (error) {
        console.error("[recalled-questions] Query error:", error);
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
          total: questions?.length || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[recalled-questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/admin/recalled-questions - Upload recalled question (Admin only)
  app.post("/api/admin/recalled-questions", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can upload recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const {
        subject_id,
        university_id,
        body,
        explanation,
        year,
        difficulty_level,
        options,
      } = req.body;

      // Validate required fields
      if (!subject_id || !university_id || !body || !Array.isArray(options) || options.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: subject_id, university_id, body, options (array)",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate options (must have exactly one correct answer)
      const correctCount = options.filter((opt: any) => opt.is_correct).length;
      if (correctCount !== 1) {
        res.status(400).json({
          status: "error",
          message: "Exactly one option must be marked as correct",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create recalled question
      const { data: question, error: createError } = await supabaseAdmin
        .from("recalled_questions")
        .insert({
          subject_id,
          university_id,
          body,
          explanation: explanation || null,
          year: year || null,
          difficulty_level: difficulty_level || "medium",
          created_by: user.id,
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

      // Insert options
      const optionRows = options.map((opt: any) => ({
        recalled_question_id: question.id,
        label: opt.label,
        body: opt.body,
        is_correct: opt.is_correct,
      }));

      const { error: optionsError } = await supabaseAdmin
        .from("recalled_question_options")
        .insert(optionRows);

      if (optionsError) {
        console.error("[admin/recalled-questions] Options error:", optionsError);
        res.status(500).json({
          status: "error",
          message: "Failed to add question options",
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
  app.get("/api/admin/recalled-questions", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can access this resource",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { subject_id, university_id, limit = "50", offset = "0" } = req.query;

      let query = supabaseAdmin
        .from("recalled_questions")
        .select("*, recalled_question_options(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (subject_id) {
        query = query.eq("subject_id", subject_id as string);
      }

      if (university_id) {
        query = query.eq("university_id", university_id as string);
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
  app.patch("/api/admin/recalled-questions/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Only admins can update recalled questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const { body, explanation, year, difficulty_level } = req.body;

      const updateData: any = {};
      if (body !== undefined) updateData.body = body;
      if (explanation !== undefined) updateData.explanation = explanation;
      if (year !== undefined) updateData.year = year;
      if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
      updateData.updated_at = new Date().toISOString();

      const { data: question, error: updateError } = await supabaseAdmin
        .from("recalled_questions")
        .update(updateData)
        .eq("id", id)
        .select("*, recalled_question_options(*)")
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
  app.delete("/api/admin/recalled-questions/:id", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization header",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
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
}
