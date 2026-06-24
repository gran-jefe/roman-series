import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import PDFDocument from "pdfkit";
import type { AnalyticsOverview, TopicPerformance, PeerRanking, PredictionResult } from "../types";

interface AnalyticsDeps {
  supabaseAdmin: SupabaseClient;
  groqApiKey: string;
}

export function registerAnalyticsRoutes(app: Express, deps: AnalyticsDeps) {
  const { supabaseAdmin, groqApiKey } = deps;

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

      // Get user profile for subscription check
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

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

      // Calculate speed_by_subject for Scholar+ (empty array for Explorer)
      let speedBySubject: any[] = [];
      if (profile?.subscription_status && profile.subscription_status !== "explorer") {
        const speedMap = new Map<string, { times: number[]; count: number }>();

        // Get all session_answers with time_spent_seconds for this user
        const { data: sessionAnswers } = await supabaseAdmin
          .from("session_answers")
          .select("question_id, time_spent_seconds")
          .in("session_id", sessions.map(s => s.id))
          .not("time_spent_seconds", "is", null);

        // Fetch question details to map to subjects
        const questionIds = sessionAnswers?.map(a => a.question_id) ?? [];
        let questionSubjectMap = new Map<string, string>();

        if (questionIds.length > 0) {
          const { data: questions } = await supabaseAdmin
            .from("questions")
            .select("id, subject_id")
            .in("id", questionIds);

          questions?.forEach(q => {
            questionSubjectMap.set(q.id, q.subject_id);
          });
        }

        // Group times by subject
        sessionAnswers?.forEach(answer => {
          const subjectId = questionSubjectMap.get(answer.question_id);
          if (subjectId && answer.time_spent_seconds) {
            const existing = speedMap.get(subjectId) || { times: [], count: 0 };
            existing.times.push(answer.time_spent_seconds);
            existing.count++;
            speedMap.set(subjectId, existing);
          }
        });

        // Build response
        speedBySubject = [...speedMap.entries()].map(([subjectId, data]) => ({
          subject_id: subjectId,
          subject_name: subjectNameMap.get(subjectId) ?? "Unknown",
          avg_time_per_question_seconds: Math.round(
            data.times.reduce((a, b) => a + b, 0) / data.times.length
          ),
        }));
      }

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
        speed_by_subject: speedBySubject,
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
        .select("utme_score, target_course, target_university_id, subscription_status")
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

      // Check access control by plan
      if (profile.subscription_status === "explorer") {
        res.json({
          status: "success",
          data: {
            locked: true,
            preview_message: "Your predicted UI aggregate is ready. Upgrade to unlock.",
          },
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

      // Calculate post_utme_target and gap_percentage
      const postUtmeTarget = requiredPutmeScore;
      const gapPercentage = postUtmeTarget > 0
        ? Math.round(((postUtmeTarget - currentPracticeAvg) / postUtmeTarget) * 1000) / 10
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

      // Build base response (Scholar-level)
      const baseResponse: any = {
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
        post_utme_target: postUtmeTarget,
        gap_percentage: gapPercentage,
        status,
      };

      // Add percentile for Elite users only
      if (profile.subscription_status === "elite" && profile.target_course) {
        // Get all users with same target course
        const { data: courseUsers } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("target_course", profile.target_course);

        const courseUserIds = courseUsers?.map((u: any) => u.id) ?? [];

        if (courseUserIds.length > 0) {
          // Get all sessions for users in this course
          const { data: allCourseSessions } = await supabaseAdmin
            .from("sessions")
            .select("user_id, score, total_questions")
            .eq("completed", true)
            .in("user_id", courseUserIds);

          // Calculate avg score per user in course
          const userCourseScores = new Map<string, { scores: number[] }>();

          for (const session of allCourseSessions ?? []) {
            const pct =
              session.total_questions > 0
                ? Math.round((session.score / session.total_questions) * 100)
                : 0;

            const existing = userCourseScores.get(session.user_id) ?? { scores: [] };
            existing.scores.push(pct);
            userCourseScores.set(session.user_id, existing);
          }

          // Calculate percentiles
          let usersOutperformed = 0;
          for (const [userId, data] of userCourseScores.entries()) {
            const avgScore = Math.round(
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            );
            if (avgScore < currentPracticeAvg) {
              usersOutperformed++;
            }
          }

          const percentile = courseUserIds.length > 0
            ? Math.round((usersOutperformed / courseUserIds.length) * 100)
            : 0;

          baseResponse.percentile = {
            percentile,
            message: `You're ahead of ${percentile}% of ${profile.target_course} aspirants`,
          };
        }
      }

      res.json({
        status: "success",
        data: baseResponse,
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

  // Helper function to fetch all analytics data
  async function fetchAnalyticsData(userId: string) {
    // Fetch profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, target_course, target_university_id, utme_score, subject_combination")
      .eq("id", userId)
      .single();

    // Fetch university
    let university = null;
    if (profile?.target_university_id) {
      const { data: uni } = await supabaseAdmin
        .from("universities")
        .select("name")
        .eq("id", profile.target_university_id)
        .single();
      university = uni;
    }

    // Fetch sessions
    const { data: sessions } = await supabaseAdmin
      .from("sessions")
      .select("id, score, total_questions, subject_id, started_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("started_at", { ascending: false });

    // Fetch topic performance
    const { data: answers } = await supabaseAdmin
      .from("session_answers")
      .select("question_id, is_correct")
      .in("session_id", sessions?.map((s: any) => s.id) || []);

    const { data: questionDetails } = await supabaseAdmin
      .from("questions")
      .select("id, topic_id")
      .in("id", answers?.map((a: any) => a.question_id) || []);

    const { data: topics } = await supabaseAdmin
      .from("topics")
      .select("id, name, subject_id")
      .in("id", questionDetails?.map((q: any) => q.topic_id) || []);

    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id, name");

    // Build topic stats
    const topicStats = new Map<string, { name: string; subject_name: string; correct: number; total: number }>();
    const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
    const topicMap = new Map((topics || []).map((t: any) => [t.id, { name: t.name, subject_id: t.subject_id }]));
    const questionMap = new Map((questionDetails || []).map((q: any) => [q.id, q.topic_id]));

    if (answers && questionDetails && topics && subjects) {

      answers.forEach((a: any) => {
        const topicId = questionMap.get(a.question_id);
        if (topicId && topicMap.has(topicId)) {
          const topicInfo = topicMap.get(topicId);
          if (topicInfo) {
            const subjectName = subjectMap.get(topicInfo.subject_id) || "Unknown";
            const key = topicId;
            const existing = topicStats.get(key) || {
              name: topicInfo.name,
              subject_name: subjectName,
              correct: 0,
              total: 0,
            };
            existing.total++;
            if (a.is_correct) existing.correct++;
            topicStats.set(key, existing);
          }
        }
      });
    }

    // Get worst and best topics
    const topicArray = Array.from(topicStats.values())
      .map((t) => ({
        ...t,
        percentage: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage);

    const worstTopics = topicArray.slice(0, 5);
    const bestTopics = topicArray.reverse().slice(0, 5);

    // Per-subject stats
    const subjectStats = new Map<string, { correct: number; total: number }>();
    if (sessions) {
      sessions.forEach((s: any) => {
        const relevant = answers?.filter((a: any) => {
          const qTopicId = questionMap.get(a.question_id);
          const topic = qTopicId ? topics?.find((t: any) => t.id === qTopicId) : null;
          return topic?.subject_id === s.subject_id;
        }) || [];

        const correct = relevant.filter((a: any) => a.is_correct).length;
        const key = s.subject_id;
        const existing = subjectStats.get(key) || { correct: 0, total: 0 };
        existing.correct += correct;
        existing.total += relevant.length;
        subjectStats.set(key, existing);
      });
    }

    const subjectAvgs = Array.from(subjectStats.entries())
      .map(([subjectId, stats]) => {
        const subject = subjects?.find((s: any) => s.id === subjectId);
        return {
          subject_name: subject?.name || "Unknown",
          percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate overall stats
    let totalCorrect = 0;
    let totalAnswered = 0;
    if (answers) {
      totalAnswered = answers.length;
      totalCorrect = answers.filter((a: any) => a.is_correct).length;
    }

    const overallAvg = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return {
      profile,
      university,
      sessions: sessions || [],
      subjectAvgs,
      worstTopics,
      bestTopics,
      overallAvg,
      totalQuestions: totalAnswered,
    };
  }

  // Helper: Get cached report or generate new one
  async function getOrGenerateReport(userId: string, data: any) {
    try {
      // Check for cached report
      const { data: cached, error: cacheError } = await supabaseAdmin
        .from("analytics_reports")
        .select("report_text, generated_at, expires_at")
        .eq("user_id", userId)
        .single();

      if (cacheError) {
        console.warn("[getOrGenerateReport] Cache check error:", cacheError.message);
      }

      const now = new Date();
      if (cached && new Date(cached.expires_at) > now) {
        console.log("[getOrGenerateReport] Returning cached report for user:", userId);
        return {
          report: cached.report_text,
          from_cache: true,
          generated_at: cached.generated_at,
          expires_at: cached.expires_at,
        };
      }

      // Generate new report
      console.log("[getOrGenerateReport] Generating new report for user:", userId);
      const groq = new Groq({ apiKey: groqApiKey });
      const reportPrompt = `You are a Post-UTME exam coach for Nigerian students.
Given the following performance data for a student, write an elaborate, encouraging, and specific study report.
Write in a warm, professional tone. Use plain text paragraphs only, no bullet points or markdown.
Each section should flow naturally into the next. Be specific: mention actual subject names, topic names,
percentage scores, and performance compared to their target.

STUDENT DATA:
Name: ${data.profile.full_name || "Student"}
Target University: ${data.university?.name || "Not selected"}
Target Course: ${data.profile.target_course || "Not specified"}
UTME Score: ${data.profile.utme_score || "Not set"}/400

Overall Performance:
- Average Score: ${data.overallAvg}%
- Total Questions Practiced: ${data.totalQuestions}
- Sessions Completed: ${data.sessions.length}

Performance by Subject:
${data.subjectAvgs.map((s: any) => `- ${s.subject_name}: ${s.percentage}%`).join("\n")}

Weakest Topics (Need Focus):
${data.worstTopics.map((t: any) => `- ${t.subject_name} - ${t.name}: ${t.percentage}%`).join("\n")}

Strongest Topics (Maintain Excellence):
${data.bestTopics.map((t: any) => `- ${t.subject_name} - ${t.name}: ${t.percentage}%`).join("\n")}

Write a comprehensive report that:
1. Opens with an overall impression of the student's exam readiness
2. Discusses performance in each subject they've practiced
3. Identifies the weakest areas and provides 3-5 specific study actions
4. Highlights strengths they should leverage
5. Closes with motivational advice tied to their admission target

Keep the report between 400-600 words. Use encouraging, constructive language.`;

      if (!groqApiKey) {
        throw new Error("Groq API key is not configured. Please set GROQ_API_KEY in environment variables.");
      }

      let message;
      try {
        message = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: reportPrompt,
            },
          ],
          model: "llama-3.3-70b-versatile",
          max_tokens: 1024,
        });
      } catch (groqError: any) {
        console.error("[getOrGenerateReport] Groq API error:", groqError);
        throw new Error(`Failed to generate report with AI: ${groqError.message || "Unknown Groq API error"}`);
      }

      const reportText = message.choices[0]?.message.content || "";
      if (!reportText) {
        throw new Error("Groq API returned empty response. Please try again.");
      }

      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Cache the report
      const { error: upsertError } = await supabaseAdmin.from("analytics_reports").upsert(
        {
          user_id: userId,
          report_text: reportText,
          generated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertError) {
        console.warn("[getOrGenerateReport] Failed to cache report:", upsertError.message);
      }

      return {
        report: reportText,
        from_cache: false,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error("[getOrGenerateReport] Error:", error);
      throw error;
    }
  }

  // GET /api/analytics/report - Generate AI report
  app.get("/api/analytics/report", async (req: Request, res: Response) => {
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

      // Check if Groq API key is configured
      if (!groqApiKey) {
        console.error("[analytics/report] Groq API key not configured");
        res.status(503).json({
          status: "error",
          message: "Report generation service is temporarily unavailable",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // TODO: Restrict to paid subscribers when access control is added
      // if (user.subscription_status === "free") {
      //   return res.status(402).json({
      //     status: "error",
      //     message: "Report generation is only available for Pro subscribers",
      //     timestamp: new Date().toISOString(),
      //   });
      // }

      const data = await fetchAnalyticsData(user.id);

      if (!data.profile) {
        res.status(400).json({
          status: "error",
          message: "Profile not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (data.totalQuestions === 0) {
        res.status(400).json({
          status: "error",
          message: "Not enough data to generate report. Please complete at least one practice session first.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await getOrGenerateReport(user.id, data);

      res.set("Cache-Control", "no-store");
      res.json({
        status: "success",
        data: {
          report: result.report,
          from_cache: result.from_cache,
          generated_at: result.generated_at,
          expires_at: result.expires_at,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/report] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        status: "error",
        message: "Failed to generate report. Please try again later.",
        error: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/report/download - Download report as PDF
  app.get("/api/analytics/report/download", async (req: Request, res: Response) => {
    try {
      // Check Bearer token in Authorization header (preferred) or query param token (fallback)
      let token: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (typeof req.query.token === "string") {
        console.warn("[analytics/report/download] Token passed via query param - consider using Authorization header for security");
        token = req.query.token;
      }

      if (!token) {
        res.status(401).json({
          status: "error",
          message: "Missing or invalid Authorization",
          timestamp: new Date().toISOString(),
        });
        return;
      }

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

      const data = await fetchAnalyticsData(user.id);

      if (!data.profile || data.totalQuestions === 0) {
        res.status(400).json({
          status: "error",
          message: "Not enough data to generate report",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get cached or generate new report
      const result = await getOrGenerateReport(user.id, data);
      const reportText = result.report;

      // Generate PDF
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="roman-series-report-${Date.now()}.pdf"`
      );

      doc.pipe(res);

      // Title
      doc.fontSize(24).font("Helvetica-Bold").text("Roman Series", { align: "center" });
      doc.fontSize(16).font("Helvetica").text("Your Personalised Study Report", { align: "center" });
      doc.moveDown(1.5);

      // Subtitle
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${data.profile.full_name || "Student"} • ${data.university?.name || "—"} • ${new Date().toLocaleDateString()}`,
          { align: "center" }
        );
      doc.moveDown(1.5);

      // Report body
      doc.fontSize(11).font("Helvetica");
      const lines = reportText.split("\n");
      lines.forEach((line: string) => {
        if (line.trim()) {
          doc.text(line, { align: "left", lineGap: 5 });
        } else {
          doc.moveDown();
        }
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(9).font("Helvetica").text("Roman Series • Confidential", {
        align: "center",
      });

      doc.end();
    } catch (error) {
      console.error("[analytics/report/download] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to generate PDF",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/speed - Detailed speed analysis by topic (Scholar+ only)
  app.get("/api/analytics/speed", async (req: Request, res: Response) => {
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

      // Check subscription
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profile?.subscription_status === "explorer") {
        res.status(403).json({
          status: "error",
          message: "Speed analysis is available for Scholar and Elite members only",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all completed sessions for this user
      const { data: sessions } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (!sessions || sessions.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get session answers with time data
      const { data: sessionAnswers } = await supabaseAdmin
        .from("session_answers")
        .select("question_id, time_spent_seconds")
        .in("session_id", sessions.map(s => s.id))
        .not("time_spent_seconds", "is", null);

      if (!sessionAnswers || sessionAnswers.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get question details with topic info
      const questionIds = sessionAnswers.map(a => a.question_id);
      const { data: questions } = await supabaseAdmin
        .from("questions")
        .select("id, topic_id")
        .in("id", questionIds);

      // Get topic details
      const topicIds = questions?.map(q => q.topic_id) ?? [];
      const { data: topics } = await supabaseAdmin
        .from("topics")
        .select("id, name, subject_id")
        .in("id", topicIds);

      // Get subject names
      const subjectIds = topics?.map(t => t.subject_id) ?? [];
      const { data: subjects } = await supabaseAdmin
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      // Build maps
      const questionTopicMap = new Map(questions?.map(q => [q.id, q.topic_id]) ?? []);
      const topicMap = new Map(topics?.map(t => [t.id, t]) ?? []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s.name]) ?? []);

      // Group by topic and calculate avg time
      const topicTimeMap = new Map<string, { times: number[]; topic: any }>();

      sessionAnswers.forEach(answer => {
        const topicId = questionTopicMap.get(answer.question_id);
        if (topicId && topicMap.has(topicId)) {
          const topic = topicMap.get(topicId);
          const existing = topicTimeMap.get(topicId) || { times: [], topic };
          if (answer.time_spent_seconds) {
            existing.times.push(answer.time_spent_seconds);
          }
          topicTimeMap.set(topicId, existing);
        }
      });

      // Build response, sorted by slowest first
      const speedData = [...topicTimeMap.values()]
        .map(({ times, topic }) => ({
          topic_id: topic.id,
          topic_name: topic.name,
          subject_name: subjectMap.get(topic.subject_id) ?? "Unknown",
          avg_seconds: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          total_answered: times.length,
        }))
        .sort((a, b) => b.avg_seconds - a.avg_seconds);

      res.json({
        status: "success",
        data: speedData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/speed] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/analytics/study-plan - AI-powered study plan (Elite only, cached 24h)
  app.get("/api/analytics/study-plan", async (req: Request, res: Response) => {
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

      // Check Elite subscription
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();

      if (profile?.subscription_status !== "elite") {
        res.status(403).json({
          status: "error",
          message: "Study plan generation is available for Elite members only",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check for cached study plan (24h)
      const { data: cachedReport } = await supabaseAdmin
        .from("analytics_reports")
        .select("cached_data")
        .eq("user_id", user.id)
        .eq("report_type", "study_plan")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cachedReport?.cached_data) {
        res.json({
          status: "success",
          data: cachedReport.cached_data,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get all completed sessions with question details
      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from("sessions")
        .select("id, user_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      console.log("[study-plan] Sessions:", sessions?.length || 0, "Error:", sessionsError);

      if (!sessions || sessions.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get session answers to calculate topic performance
      const { data: answers, error: answersError } = await supabaseAdmin
        .from("session_answers")
        .select("session_id, is_correct, question_id")
        .in("session_id", sessions.map(s => s.id));

      console.log("[study-plan] Answers:", answers?.length || 0, "Error:", answersError);

      if (!answers || answers.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get unique question IDs and fetch their topic info
      const questionIds = Array.from(new Set(answers.map(a => a.question_id)));
      console.log("[study-plan] Question IDs:", questionIds.length);

      const { data: questions, error: questionsError } = await supabaseAdmin
        .from("questions")
        .select("id, topic_id")
        .in("id", questionIds);

      console.log("[study-plan] Questions:", questions?.length || 0, "Error:", questionsError);

      // Get topic names
      const topicIds = Array.from(new Set(questions?.map(q => q.topic_id).filter(Boolean) || []));
      console.log("[study-plan] Topic IDs:", topicIds.length);

      let topics: any[] = [];
      let subjects: any[] = [];

      if (topicIds.length > 0) {
        const { data: topicsData, error: topicsError } = await supabaseAdmin
          .from("topics")
          .select("id, name, subject_id")
          .in("id", topicIds);

        console.log("[study-plan] Topics:", topicsData?.length || 0, "Error:", topicsError);
        topics = topicsData || [];

        // Get subject names
        const subjectIds = Array.from(new Set(topics?.map(t => t.subject_id).filter(Boolean) || []));
        console.log("[study-plan] Subject IDs:", subjectIds.length);

        if (subjectIds.length > 0) {
          const { data: subjectsData, error: subjectsError } = await supabaseAdmin
            .from("subjects")
            .select("id, name")
            .in("id", subjectIds);

          console.log("[study-plan] Subjects:", subjectsData?.length || 0, "Error:", subjectsError);
          subjects = subjectsData || [];
        }
      }

      // Build lookup maps
      const topicMap = new Map(topics?.map(t => [t.id, t]) || []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s.name]) || []);
      const questionMap = new Map(questions?.map(q => [q.id, q]) || []);

      // Calculate topic performance
      const topicPerformance = new Map<string, { correct: number; total: number; subjectName: string }>();

      for (const answer of answers) {
        const question = questionMap.get(answer.question_id);
        if (!question) continue;

        const topic = topicMap.get(question.topic_id);
        if (!topic) continue;

        const subjectName = subjectMap.get(topic.subject_id) || "Unknown";
        const topicKey = `${topic.name}|${subjectName}`;

        const entry = topicPerformance.get(topicKey) || { correct: 0, total: 0, subjectName };
        entry.total++;
        if (answer.is_correct) entry.correct++;
        topicPerformance.set(topicKey, entry);
      }

      // Convert to array format
      const topicPerformanceArray = Array.from(topicPerformance.entries()).map(([key, data]) => {
        const [topicName, subjectName] = key.split("|");
        const mastery_percentage = Math.round((data.correct / data.total) * 100);
        return {
          topic_name: topicName,
          subject_name: subjectName,
          mastery_percentage,
          total_answered: data.total,
          correct: data.correct,
        };
      });

      if (!topicPerformanceArray || topicPerformanceArray.length === 0) {
        res.json({
          status: "success",
          data: [],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const topicPerformance_refined = topicPerformanceArray;

      // Get weakest topics for AI context
      const weakTopics = topicPerformance_refined
        .filter((t: any) => t.mastery_percentage < 70)
        .sort((a: any, b: any) => a.mastery_percentage - b.mastery_percentage)
        .slice(0, 10);

      // Call Groq to generate study plan
      const groq = new Groq({ apiKey: groqApiKey });

      const prompt = `You are an expert Post-UTME exam coach for Nigerian university entrance exams. A student needs a detailed, personalized study plan based on their performance data.

STUDENT PERFORMANCE DATA:
Weak Topics (mastery below 70%):
${weakTopics.map((t: any) =>
  `- ${t.topic_name} (${t.subject_name}): ${t.mastery_percentage}% mastery, ${t.total_answered} questions answered`
).join("\n")}

Create a comprehensive, prioritized study plan with 5-8 topics.
Return ONLY a valid JSON array with no markdown formatting.

Each item in the array must have these exact fields:
{
  "priority": <integer 1-8, where 1 is most urgent>,
  "topic_name": <string>,
  "subject_name": <string>,
  "current_mastery": <number, the current mastery percentage>,
  "target_mastery": 70,
  "urgency": <"critical" if below 40%, "high" if 40-54%, "medium" if 55-64%, "low" if 65-69%>,
  "reason": <2-3 sentence explanation of why this topic is important for Post-UTME and what gap exists>,
  "study_actions": [
    <3-4 specific, actionable study steps the student should take for this topic>
  ],
  "estimated_hours": <realistic number of hours needed to reach 70% mastery>,
  "quick_tip": <one practical exam technique specific to this topic>
}

Prioritize by: urgency first, then by how many questions have been answered (less practice = higher priority). Be specific to Nigerian Post-UTME context.`;

      const message = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const responseText = message.choices[0].message.content || "";

      // Parse JSON response
      let studyPlan: any = [];
      try {
        studyPlan = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse Groq response:", responseText);
        studyPlan = weakTopics.slice(0, 5).map((t: any, idx: number) => ({
          priority: idx + 1,
          topic_name: t.topic_name,
          subject_name: t.subject_name,
          current_mastery: t.mastery_percentage,
          target_mastery: 70,
          urgency: t.mastery_percentage < 40 ? 'critical' :
                   t.mastery_percentage < 55 ? 'high' :
                   t.mastery_percentage < 65 ? 'medium' : 'low',
          reason: `Your mastery of ${t.topic_name} is currently ${t.mastery_percentage}%. Improving this topic will significantly boost your Post-UTME score. You need ${70 - t.mastery_percentage}% more mastery to reach the target.`,
          study_actions: [
            `Review all ${t.topic_name} questions in your error bank`,
            `Practice at least 20 questions on this topic daily`,
            `Focus on understanding why wrong answers are incorrect`,
          ],
          estimated_hours: Math.ceil((70 - t.mastery_percentage) / 5),
          quick_tip: `For ${t.subject_name} questions, always eliminate obviously wrong options first.`
        }));
      }

      // Cache the study plan
      await supabaseAdmin.from("analytics_reports").insert({
        user_id: user.id,
        report_type: "study_plan",
        cached_data: studyPlan,
        created_at: new Date().toISOString(),
      });

      const totalEstimatedHours = studyPlan.reduce((sum: number, t: any) => sum + (t.estimated_hours || 0), 0);
      const criticalTopics = studyPlan.filter((t: any) => t.urgency === 'critical').length;

      res.json({
        status: "success",
        data: {
          study_plan: studyPlan,
          summary: {
            total_weak_topics: weakTopics.length,
            critical_topics: criticalTopics,
            total_estimated_hours: totalEstimatedHours,
            generated_at: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[analytics/study-plan] Full error:", error);
      res.status(500).json({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to generate study plan",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
