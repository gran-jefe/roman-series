import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";

interface LeaderboardDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerLeaderboardRoutes(app: Express, deps: LeaderboardDeps) {
  const { supabaseAdmin } = deps;

  app.get("/api/leaderboard/top-students", async (req: Request, res: Response) => {
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

      // Get user profile and plan
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status, target_course")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        res.status(401).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get plan limits
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

      // Parse and validate query params
      let window = (req.query.window as string)?.toLowerCase() || "overall";
      let scope = (req.query.scope as string)?.toLowerCase() || "global";

      // Access control: apply plan-based restrictions
      let isTruncated = false;
      let maxResults = null;

      if (profile.subscription_status === "explorer") {
        // Explorer: top 20 global only
        window = "overall";
        scope = "global";
        maxResults = 20;
        isTruncated = true;
      } else if (profile.subscription_status === "scholar") {
        // Scholar: full leaderboard, global only, respect window
        scope = "global";
        if (!["weekly", "overall"].includes(window)) {
          window = "overall";
        }
      } else {
        // Elite: respect both window and scope
        if (!["weekly", "overall"].includes(window)) {
          window = "overall";
        }
        if (!["global", "cohort"].includes(scope)) {
          scope = "global";
        }
      }

      // Calculate date filter for weekly window
      let startDate = null;
      let resetsAt = null;
      if (window === "weekly") {
        const now = new Date();
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);

        // Calculate when the week resets (7 days from now)
        resetsAt = new Date(now);
        resetsAt.setDate(resetsAt.getDate() + 7);
      }

      // Build query for sessions
      let sessionsQuery = supabaseAdmin
        .from("sessions")
        .select("user_id, score, total_questions")
        .eq("completed", true);

      if (startDate) {
        sessionsQuery = sessionsQuery.gte("started_at", startDate.toISOString());
      }

      // For cohort scope, filter by target_course
      if (scope === "cohort" && profile.target_course) {
        // Get user IDs with same target_course
        const { data: cohortProfiles, error: cohortError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("target_course", profile.target_course);

        if (cohortError) {
          console.error("[leaderboard/top-students] Cohort query error:", cohortError);
          res.status(500).json({
            status: "error",
            message: "Failed to fetch cohort members",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const cohortUserIds = cohortProfiles?.map((p: any) => p.id) ?? [];
        if (cohortUserIds.length === 0) {
          res.json({
            status: "success",
            data: {
              rankings: [],
              window,
              scope,
              is_truncated: false,
              current_user_rank: null,
              total_participants: 0,
              resets_at: resetsAt?.toISOString() || null,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        sessionsQuery = sessionsQuery.in("user_id", cohortUserIds);
      } else if (scope === "cohort") {
        // No course set, can't show cohort
        res.json({
          status: "success",
          data: {
            rankings: [],
            window,
            scope,
            is_truncated: false,
            current_user_rank: null,
            total_participants: 0,
            resets_at: resetsAt?.toISOString() || null,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: allSessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) {
        console.error("[leaderboard/top-students] Sessions query error:", sessionsError);
        res.status(500).json({
          status: "error",
          message: "Failed to fetch sessions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate scores per user
      const userScores = new Map<string, { scores: number[]; sessions: number }>();

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

      // Sort and optionally truncate
      let sortedUsers = Array.from(userScores.entries())
        .map(([userId, data]) => ({
          user_id: userId,
          avg_score: Math.round(
            data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          ),
          sessions: data.sessions,
        }))
        .sort((a, b) => b.avg_score - a.avg_score);

      const totalParticipants = sortedUsers.length;
      const currentUserRank = sortedUsers.findIndex((u) => u.user_id === user.id) + 1 || null;

      if (maxResults) {
        sortedUsers = sortedUsers.slice(0, maxResults);
      }

      // Fetch user profiles for display
      const userIds = sortedUsers.map((u) => u.user_id);
      const profilesResult = userIds.length > 0
        ? await supabaseAdmin
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds)
        : { data: [] };

      const userProfiles = profilesResult.data ?? [];
      const profileMap = new Map(userProfiles?.map((p: any) => [p.id, p]) ?? []);

      const rankings = sortedUsers.map((entry, idx) => {
        const userProfile = profileMap.get(entry.user_id);
        const fullName = userProfile?.full_name ?? "Unknown";
        const names = fullName.split(" ");
        const nameInitial =
          names.length > 1
            ? `${names[0]} ${names[names.length - 1].charAt(0)}.`
            : fullName;

        return {
          rank: idx + 1,
          name_initial: nameInitial,
          avg_score: entry.avg_score,
          sessions_count: entry.sessions,
          is_current_user: entry.user_id === user.id,
        };
      });

      res.json({
        status: "success",
        data: {
          rankings,
          window,
          scope,
          is_truncated: isTruncated,
          current_user_rank: currentUserRank,
          total_participants: totalParticipants,
          resets_at: resetsAt?.toISOString() || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[leaderboard/top-students] Full error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

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
              .select("id, full_name, target_university_id, subscription_status")
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
          subscription_status: profile?.subscription_status ?? null,
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
