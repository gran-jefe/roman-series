import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

interface LeaderboardDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerLeaderboardRoutes(app: Express, deps: LeaderboardDeps) {
  const { supabaseAdmin } = deps;

  app.get("/api/leaderboard", async (req: Request, res: Response) => {
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

      const { subjectId, universityId } = req.query;

      let query = supabaseAdmin
        .from("sessions")
        .select("user_id, score, total_questions, subject_id, university_id")
        .eq("completed", true);

      if (subjectId) {
        query = query.eq("subject_id", subjectId as string);
      }

      if (universityId) {
        query = query.eq("university_id", universityId as string);
      }

      const { data: allSessions, error } = await query;

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userScores = new Map<
        string,
        { scores: number[]; sessions: number }
      >();

      for (const session of allSessions ?? []) {
        const pct =
          session.total_questions > 0
            ? Math.round((session.score / session.total_questions) * 100)
            : 0;

        const existing = userScores.get(session.user_id) ?? {
          scores: [],
          sessions: 0,
        };
        existing.scores.push(pct);
        existing.sessions++;
        userScores.set(session.user_id, existing);
      }

      const leaderboardData = Array.from(userScores.entries())
        .map(([userId, data]) => ({
          user_id: userId,
          avg_score: Math.round(
            data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          ),
          total_sessions: data.sessions,
        }))
        .sort((a, b) => b.avg_score - a.avg_score)
        .slice(0, 20);

      const userIds = leaderboardData.map((l) => l.user_id);
      const { data: profiles } =
        userIds.length > 0
          ? await supabaseAdmin
              .from("profiles")
              .select("id, full_name, target_university_id")
              .in("id", userIds)
          : { data: [] };

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) ?? []);

      const universityIds = Array.from(
        new Set(
          profiles?.map((p: any) => p.target_university_id).filter(Boolean)
        )
      );
      const { data: universities } =
        universityIds.length > 0
          ? await supabaseAdmin
              .from("universities")
              .select("id, short_code")
              .in("id", universityIds)
          : { data: [] };

      const univMap = new Map(universities?.map((u: any) => [u.id, u]) ?? []);

      const leaderboard = leaderboardData.map((entry, idx) => {
        const profile = profileMap.get(entry.user_id);
        const fullName = profile?.full_name ?? "Unknown";
        const names = fullName.split(" ");
        const displayName =
          names.length > 1
            ? `${names[0]} ${names[names.length - 1].charAt(0)}.`
            : fullName;

        const university = profile?.target_university_id
          ? univMap.get(profile.target_university_id)
          : null;

        return {
          rank: idx + 1,
          full_name: displayName,
          average_score: entry.avg_score,
          total_sessions: entry.total_sessions,
          university_code: university?.short_code ?? null,
          user_id: entry.user_id,
        };
      });

      res.json({
        status: "success",
        data: leaderboard,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[leaderboard] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
