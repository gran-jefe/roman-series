import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

interface PlansDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerPlansRoutes(app: Express, deps: PlansDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/plans/limits - Get current user's plan limits
  app.get("/api/plans/limits", async (req: Request, res: Response) => {
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
        return;
      }

      // Get user's profile to find their subscription status
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

      // Get plan limits for their subscription status
      const { data: planLimits, error: planError } = await supabaseAdmin
        .from("plan_limits")
        .select("*")
        .eq("plan_id", profile.subscription_status)
        .single();

      if (planError || !planLimits) {
        res.status(500).json({
          status: "error",
          message: "Plan limits not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          plan_id: profile.subscription_status,
          ...planLimits,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[plans/limits] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/plans/all - Get all available plans (public, no auth required)
  app.get("/api/plans/all", async (req: Request, res: Response) => {
    try {
      const { data: plans, error } = await supabaseAdmin
        .from("plan_limits")
        .select("*")
        .order("plan_id", { ascending: true });

      if (error || !plans) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch plans",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: plans,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[plans/all] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
