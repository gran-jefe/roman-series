import { Express, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

interface FeedbackDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerFeedbackRoutes(app: Express, deps: FeedbackDeps) {
  const { supabaseAdmin } = deps;

  // POST /api/feedback - Submit feedback (authenticated)
  app.post("/api/feedback", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { rating, category, message, emoji_mood } = req.body;

      // Validate required fields
      if (!rating || !category) {
        res.status(400).json({
          status: "error",
          message: "rating and category are required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate rating
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        res.status(400).json({
          status: "error",
          message: "rating must be between 1 and 5",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate category
      const validCategories = ["general", "questions", "ui", "performance", "features", "other"];
      if (!validCategories.includes(category)) {
        res.status(400).json({
          status: "error",
          message: `category must be one of: ${validCategories.join(", ")}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Insert feedback
      const { data: feedback, error: insertError } = await supabaseAdmin
        .from("feedback")
        .insert({
          user_id: req.userId,
          rating,
          category,
          message: message || null,
          emoji_mood: emoji_mood || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Feedback] Failed to insert feedback:", insertError);
        res.status(500).json({
          status: "error",
          message: "Failed to submit feedback",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[Feedback] Submitted:", feedback.id, "rating:", rating, "category:", category);

      res.status(201).json({
        status: "success",
        data: {
          message: "Thank you for your feedback! 🙏",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[feedback] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/feedback/me - Check whether the current user has ever submitted
  // feedback, and whether they've completed at least one session (so brand-new
  // users aren't asked to rate an app they haven't used yet).
  app.get("/api/feedback/me", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const [feedbackRes, sessionRes] = await Promise.all([
        supabaseAdmin
          .from("feedback")
          .select("id, created_at")
          .eq("user_id", req.userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", req.userId)
          .eq("completed", true),
      ]);

      if (feedbackRes.error) {
        console.error("[Feedback] Failed to check feedback status:", feedbackRes.error);
        res.status(500).json({
          status: "error",
          message: "Failed to check feedback status",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (sessionRes.error) {
        console.error("[Feedback] Failed to check session history:", sessionRes.error);
        res.status(500).json({
          status: "error",
          message: "Failed to check session history",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          has_submitted: !!feedbackRes.data,
          last_submitted_at: feedbackRes.data?.created_at ?? null,
          has_completed_session: (sessionRes.count ?? 0) > 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[feedback/me] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/feedback/stats - Aggregate counts for the admin graphical report
  // (rating distribution, category breakdown, mood breakdown, daily volume
  // over the last 30 days). Feedback volume is small enough on this platform
  // to aggregate in memory rather than reach for PostgREST group-by syntax.
  app.get("/api/feedback/stats", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Access denied. Admin only.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: rows, error } = await supabaseAdmin
        .from("feedback")
        .select("rating, category, emoji_mood, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) {
        console.error("[feedback/stats] Query error:", error);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch feedback stats",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const feedback = rows || [];

      const ratingCounts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      const categoryCounts: Record<string, number> = {
        general: 0,
        questions: 0,
        ui: 0,
        performance: 0,
        features: 0,
        other: 0,
      };
      const moodCounts: Record<string, number> = {
        love: 0,
        like: 0,
        okay: 0,
        better: 0,
        frustrated: 0,
      };

      let ratingSum = 0;
      feedback.forEach((f: any) => {
        if (f.rating >= 1 && f.rating <= 5) {
          ratingCounts[String(f.rating)] = (ratingCounts[String(f.rating)] || 0) + 1;
          ratingSum += f.rating;
        }
        if (f.category in categoryCounts) {
          categoryCounts[f.category] += 1;
        }
        if (f.emoji_mood && f.emoji_mood in moodCounts) {
          moodCounts[f.emoji_mood] += 1;
        }
      });

      // Daily volume for the last 30 days, zero-filled so the line doesn't
      // skip gaps.
      const days = 30;
      const volumeByDay: { date: string; count: number }[] = [];
      const dayBuckets = new Map<string, number>();
      feedback.forEach((f: any) => {
        const day = (f.created_at as string).slice(0, 10);
        dayBuckets.set(day, (dayBuckets.get(day) || 0) + 1);
      });
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        volumeByDay.push({ date: key, count: dayBuckets.get(key) || 0 });
      }

      res.json({
        status: "success",
        data: {
          total: feedback.length,
          average_rating: feedback.length ? Math.round((ratingSum / feedback.length) * 10) / 10 : 0,
          rating_counts: ratingCounts,
          category_counts: categoryCounts,
          mood_counts: moodCounts,
          volume_by_day: volumeByDay,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[feedback/stats] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/feedback - Get all feedback (admin only)
  app.get("/api/feedback", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      if (req.userRole !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Access denied. Admin only.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get pagination params
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const offset = (page - 1) * limit;

      // Get total count
      const { count: totalCount } = await supabaseAdmin
        .from("feedback")
        .select("*", { count: "exact", head: true });

      // Get paginated feedback with user info
      const { data: feedbackList, error: feedbackError } = await supabaseAdmin
        .from("feedback")
        .select(`
          id,
          user_id,
          rating,
          category,
          message,
          emoji_mood,
          created_at,
          profiles:user_id(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (feedbackError) {
        console.error("[Feedback] Error fetching feedback:", feedbackError);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch feedback",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: {
          feedback: feedbackList || [],
          pagination: {
            page,
            limit,
            total: totalCount || 0,
            pages: Math.ceil((totalCount || 0) / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[feedback/admin] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
