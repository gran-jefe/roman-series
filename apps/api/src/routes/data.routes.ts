import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

interface DataDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerDataRoutes(app: Express, deps: DataDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/universities
  app.get("/api/universities", async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("universities")
        .select("id, name, short_code, colour_token, is_available, created_at, updated_at")
        .order("name");

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const universities = (data || []).map((u: any) => ({
        ...u,
        is_available: u.short_code === "UI" || u.is_available === true,
      }));

      res.json({
        status: "success",
        data: universities,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[universities] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/subjects
  app.get("/api/subjects", async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("subjects")
        .select("*")
        .order("name");

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
      console.error("[subjects] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/topics - Fetch topics for subject + university
  app.get("/api/topics", async (req: Request, res: Response) => {
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

      const { subjectId, universityId } = req.query;

      if (!subjectId || !universityId) {
        res.status(400).json({
          status: "error",
          message: "Missing required query parameters: subjectId, universityId",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data, error } = await supabaseAdmin
        .from("topics")
        .select("*")
        .eq("subject_id", subjectId as string)
        .eq("university_id", universityId as string)
        .order("name", { ascending: true });

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
      console.error("[topics] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/topics/:id - Fetch single topic
  app.get("/api/topics/:id", async (req: Request, res: Response) => {
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

      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("topics")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        res.status(404).json({
          status: "error",
          message: "Topic not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[topics/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/questions
  app.get("/api/questions", async (req: Request, res: Response) => {
    try {
      const { topicId, limit = 10, offset = 0 } = req.query;

      let query = supabaseAdmin.from("questions").select("*");

      if (topicId) {
        query = query.eq("topic_id", topicId as string);
      }

      const { data, error, count } = await query
        .order("id")
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

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
        count: count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/questions/:id
  app.get("/api/questions/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from("questions")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        res.status(404).json({
          status: "error",
          message: "Question not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[questions/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
