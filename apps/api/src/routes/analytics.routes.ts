import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsOverview, TopicPerformance, PeerRanking, PredictionResult } from "types";

interface AnalyticsDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerAnalyticsRoutes(app: Express, deps: AnalyticsDeps) {
  const { supabaseAdmin } = deps;

  // GET /api/analytics/overview - User's performance overview with streak & time
  app.get("/api/analytics/overview", async (req: Request, res: Response) => {
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

      // Get all completed sessions with time and date info
      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .select("id, score, total_questions, subject_id, started_at, time_taken_seconds, completed")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("started_at", { ascending: true });

      if (sessionError || !sessions) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch sessions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (sessions.length === 0) {
        // Return empty stats for new user
        res.json({
          status: "success",
          data: {
            total_sessions: 0,
            total_questions_answered: 0,
            best_score_percentage: 0,
            avg_score_overall: 0,
            current_streak_days: 0,
            longest_streak_days: 0,
            total_time_practiced_seconds: 0,
            avg_time_per_question_seconds: 0,
            avg_score_by_subject: [],
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate metrics
      const totalSessions = sessions.length;
      const totalQuestionsAnswered = sessions.reduce((sum: number, s: any) => sum + s.total_questions, 0);

      const bestScorePercentage = Math.max(
        ...sessions.map((s: any) =>
          s.total_questions > 0
            ? Math.round((s.score / s.total_questions) * 100)
            : 0
        )
      );

      const avgScoreOverall = Math.round(
        sessions.reduce((sum: number, s: any) => {
          return sum + (s.total_questions > 0 ? (s.score / s.total_questions) * 100 : 0);
        }, 0) / sessions.length
      );

      const totalTimeSeconds = sessions.reduce((sum: number, s: any) => sum + (s.time_taken_seconds || 0), 0);
      const avgTimePerQuestion = totalQuestionsAnswered > 0 ? Math.round(totalTimeSeconds / totalQuestionsAnswered) : 0;

      // Calculate streaks
      const sessionsByDay = new Map<string, boolean>();
      sessions.forEach((s: any) => {
        const date = new Date(s.started_at).toISOString().split("T")[0];
        sessionsByDay.set(date, true);
      });

      const today = new Date().toISOString().split("T")[0];
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let currentDate = new Date(today);

      // Walk backwards from today to count current streak
      for (let i = 0; i < 365; i++) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (sessionsByDay.has(dateStr)) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (i === 0 && !sessionsByDay.has(dateStr)) {
          // Today has no session, check yesterday for streak
          currentDate.setDate(currentDate.getDate() - 1);
          const yesterdayStr = currentDate.toISOString().split("T")[0];
          if (sessionsByDay.has(yesterdayStr)) {
            // Start counting from yesterday
            currentStreak = 1;
            currentDate.setDate(currentDate.getDate() - 1);
            continue;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Calculate longest streak
      const sortedDates = Array.from(sessionsByDay.keys()).sort();
      tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const currentSessionDate = new Date(sortedDates[i]);
        const previousSessionDate = new Date(sortedDates[i - 1]);
        const dayDiff = Math.floor(
          (currentSessionDate.getTime() - previousSessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayDiff === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Calculate avg score by subject
      const subjectMap = new Map<string, { scores: number[]; total: number }>();
      sessions.forEach((s: any) => {
        if (!s.subject_id) return;
        const existing = subjectMap.get(s.subject_id) || { scores: [], total: 0 };
        const pct =
          s.total_questions > 0
            ? Math.round((s.score / s.total_questions) * 100)
            : 0;
        existing.scores.push(pct);
        existing.total++;
        subjectMap.set(s.subject_id, existing);
      });

      const subjectIds = [...subjectMap.keys()];
      const { data: subjectsData } =
        subjectIds.length > 0
          ? await supabaseAdmin
              .from("subjects")
              .select("id, name")
              .in("id", subjectIds)
          : { data: [] };

      const subjectNameMap = new Map(
        subjectsData?.map((s: any) => [s.id, s.name]) ?? []
      );

      const avgScoreBySubject = [...subjectMap.entries()].map(([subjectId, data]) => ({
        subject_id: subjectId,
        subject_name: subjectNameMap.get(subjectId) ?? "Unknown",
        avg_percentage: Math.round(
          data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length
        ),
        sessions_count: data.total,
      }));

      const response: AnalyticsOverview = {
        total_sessions: totalSessions,
        total_questions_answered: totalQuestionsAnswered,
        best_score_percentage: bestScorePercentage,
        avg_score_overall: avgScoreOverall,
        current_streak_days: currentStreak,
        longest_streak_days: longestStreak,
        total_time_practiced_seconds: totalTimeSeconds,
        avg_time_per_question_seconds: avgTimePerQuestion,
        avg_score_by_subject: avgScoreBySubject,
      };

      res.json({
        status: "success",
        data: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/overview] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/topics - Topic-level performance
  app.get("/api/analytics/topics", async (req: Request, res: Response) => {
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

      // Get session answers with question and topic info
      const { data: answers, error: answersError } = await supabaseAdmin
        .from("session_answers")
        .select("question_id, is_correct, sessions!inner(id, user_id)")
        .eq("sessions.user_id", user.id)
        .eq("sessions.completed", true);

      if (answersError || !answers) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch answers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (answers.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get unique question IDs
      const questionIds = [...new Set(answers.map((a: any) => a.question_id))];

      // Fetch question data with topic info
      const { data: questions } = await supabaseAdmin
        .from("questions")
        .select("id, topic_id, subject_id")
        .in("id", questionIds);

      const questionMap = new Map(questions?.map((q: any) => [q.id, q]) ?? []);

      // Get unique topic IDs
      const topicIds = [...new Set(
        questions?.map((q: any) => q.topic_id).filter(Boolean) ?? []
      )];

      // Fetch topic and subject data
      let topicsData: any[] = [];
      let subjectsData: any[] = [];

      if (topicIds.length > 0) {
        const { data: topics } = await supabaseAdmin
          .from("topics")
          .select("id, name, subject_id")
          .in("id", topicIds);
        topicsData = topics || [];

        const subjectIds = [...new Set(topicsData.map((t: any) => t.subject_id))];
        if (subjectIds.length > 0) {
          const { data: subjects } = await supabaseAdmin
            .from("subjects")
            .select("id, name, colour_token")
            .in("id", subjectIds);
          subjectsData = subjects || [];
        }
      }

      const topicMap = new Map(topicsData.map((t: any) => [t.id, t]));
      const subjectMap = new Map(subjectsData.map((s: any) => [s.id, s]));

      // Group by topic and calculate stats
      const topicStats = new Map<
        string,
        {
          topic: any;
          subject: any;
          total_answered: number;
          correct: number;
          session_ids: Set<string>;
        }
      >();

      answers.forEach((answer: any) => {
        const question = questionMap.get(answer.question_id);
        if (!question?.topic_id) return;

        const topicId = question.topic_id;
        const existing = topicStats.get(topicId) || {
          topic: topicMap.get(topicId),
          subject: subjectMap.get(topicMap.get(topicId)?.subject_id),
          total_answered: 0,
          correct: 0,
          session_ids: new Set(),
        };

        existing.total_answered++;
        if (answer.is_correct) existing.correct++;
        existing.session_ids.add(answer.sessions.id);

        topicStats.set(topicId, existing);
      });

      // Build response
      const topicPerformances: TopicPerformance[] = Array.from(topicStats.entries())
        .map(([topicId, data]) => ({
          topic_id: topicId,
          topic_name: data.topic?.name || "Unknown",
          subject_name: data.subject?.name || "Unknown",
          subject_colour_token: data.subject?.colour_token || "#666666",
          total_answered: data.total_answered,
          correct: data.correct,
          avg_percentage: Math.round((data.correct / data.total_answered) * 100),
          sessions_count: data.session_ids.size,
        }))
        .sort((a, b) => b.avg_percentage - a.avg_percentage); // Sort by score desc

      res.json({
        status: "success",
        data: topicPerformances,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/topics] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/peers - Peer ranking for students with same course
  app.get("/api/analytics/peers", async (req: Request, res: Response) => {
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

      // Get current user's profile
      const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("target_course, subject_combination, full_name")
        .eq("id", user.id)
        .single();

      if (!currentProfile) {
        res.status(401).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all profiles with same target_course
      const { data: peerProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, subject_combination")
        .eq("target_course", currentProfile.target_course);

      if (!peerProfiles || peerProfiles.length === 0) {
        res.json({
          status: "success",
          data: {
            rank: 1,
            total_peers: 1,
            my_avg: 0,
            peers: [],
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate avg score for each peer
      const peerIds = peerProfiles.map((p: any) => p.id);
      const { data: peerSessions } = await supabaseAdmin
        .from("sessions")
        .select("user_id, score, total_questions")
        .in("user_id", peerIds)
        .eq("completed", true);

      const peerStats = new Map<string, { scores: number[]; total: number }>();
      peerSessions?.forEach((session: any) => {
        const existing = peerStats.get(session.user_id) || { scores: [], total: 0 };
        const pct = session.total_questions > 0 ? (session.score / session.total_questions) * 100 : 0;
        existing.scores.push(pct);
        existing.total++;
        peerStats.set(session.user_id, existing);
      });

      // Build peer list with rankings
      const peerList = peerProfiles
        .map((profile: any) => {
          const stats = peerStats.get(profile.id);
          const avgScore = stats
            ? Math.round(stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length)
            : 0;
          return {
            id: profile.id,
            name_initial: profile.full_name?.charAt(0).toUpperCase() || "?",
            avg_score: avgScore,
            sessions_count: stats?.total || 0,
            is_me: profile.id === user.id,
          };
        })
        .sort((a, b) => {
          // Sort by avg_score desc, then by sessions_count desc as tiebreaker
          if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
          return b.sessions_count - a.sessions_count;
        });

      // Add ranks
      const peersWithRank = peerList.map((peer, index) => ({
        rank: index + 1,
        ...peer,
      }));

      // Find current user's rank
      const myPeer = peersWithRank.find((p: any) => p.is_me);
      const myRank = myPeer?.rank || 1;
      const myAvg = myPeer?.avg_score || 0;

      res.json({
        status: "success",
        data: {
          rank: myRank,
          total_peers: peersWithRank.length,
          my_avg: myAvg,
          peers: peersWithRank.map((p: any) => ({
            rank: p.rank,
            name_initial: p.name_initial,
            avg_score: p.avg_score,
            is_me: p.is_me,
            sessions_count: p.sessions_count,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/peers] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/prediction - UTME score prediction for admission target
  app.get("/api/analytics/prediction", async (req: Request, res: Response) => {
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

      // Get user's profile with UTME score and target course
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("utme_score, target_course, target_university_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        res.status(404).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get cutoff marks for user's university and course (latest year first)
      const { data: cutoffMarks } = await supabaseAdmin
        .from("cutoff_marks")
        .select("*")
        .eq("university_id", profile.target_university_id)
        .eq("course", profile.target_course)
        .order("year", { ascending: false })
        .limit(1);

      // Get user's average practice score
      const { data: sessions } = await supabaseAdmin
        .from("sessions")
        .select("score, total_questions")
        .eq("user_id", user.id)
        .eq("completed", true);

      let currentPracticeAvg = 0;
      if (sessions && sessions.length > 0) {
        const totalScore = sessions.reduce((sum: number, s: any) => sum + s.score, 0);
        const totalQuestions = sessions.reduce((sum: number, s: any) => sum + s.total_questions, 0);
        currentPracticeAvg = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
      }

      // Build response based on whether we have UTME score and cutoff data
      if (!profile.utme_score || !cutoffMarks || cutoffMarks.length === 0) {
        const response: PredictionResult = {
          utme_score: profile.utme_score || null,
          cutoff: null,
          utme_qualifies: false,
          putme_qualifies: false,
          utme_contribution: 0,
          current_practice_avg: currentPracticeAvg,
          predicted_total: 0,
          required_putme_score: 0,
          status: "no_data",
        };

        res.json({
          status: "success",
          data: response,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const cutoff = cutoffMarks[0];
      const utmeScore = profile.utme_score;

      // Calculate prediction
      const utmeContribution = (utmeScore / 400) * cutoff.utme_weight;
      const putmeContribution = (currentPracticeAvg / 100) * cutoff.putme_weight;
      const predictedTotal = utmeContribution + putmeContribution;

      // Calculate required Post-UTME score
      const requiredPutmeScore =
        cutoff.putme_weight > 0
          ? Math.ceil(((cutoff.combined_cutoff - utmeContribution) / cutoff.putme_weight) * 100)
          : 0;

      // Admission requirements:
      // 1. UTME score must be >= 200 (minimum cutoff)
      // 2. PUTME score must be >= 50% (minimum percentage)
      // 3. Combined score must meet cutoff
      const utmeQualifies = utmeScore >= cutoff.utme_cutoff;
      const putmeMinimum = 50; // Minimum 50% required for PUTME
      const putmeQualifies = currentPracticeAvg >= putmeMinimum;
      const predictedTotalRounded = Math.round(predictedTotal * 10) / 10;

      // Determine status
      let status: "on_track" | "at_risk" | "no_data" = "no_data";

      // Must meet both UTME and PUTME minimums
      if (!utmeQualifies || !putmeQualifies) {
        status = "at_risk";
      } else if (predictedTotalRounded >= cutoff.combined_cutoff) {
        status = "on_track";
      } else if (currentPracticeAvg >= requiredPutmeScore) {
        status = "on_track";
      } else {
        status = "at_risk";
      }

      const response: PredictionResult = {
        utme_score: utmeScore,
        cutoff: {
          course: cutoff.course,
          year: cutoff.year,
          utme_cutoff: cutoff.utme_cutoff,
          combined_cutoff: cutoff.combined_cutoff,
          utme_weight: cutoff.utme_weight,
          putme_weight: cutoff.putme_weight,
        },
        utme_qualifies: utmeQualifies,
        putme_qualifies: putmeQualifies,
        utme_contribution: Math.round(utmeContribution * 10) / 10,
        current_practice_avg: currentPracticeAvg,
        predicted_total: predictedTotalRounded,
        required_putme_score: requiredPutmeScore,
        status,
      };

      res.json({
        status: "success",
        data: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/prediction] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
