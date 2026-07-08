import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { shuffleArray } from "../utils/helpers";
import { batchQuery } from "../lib/supabase";

interface SessionsDeps {
  supabaseAdmin: SupabaseClient;
}

export function registerSessionsRoutes(app: Express, deps: SessionsDeps) {
  const { supabaseAdmin } = deps;

  // POST /api/sessions/start
  app.post("/api/sessions/start", async (req: Request, res: Response) => {
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

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select("*")
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

      // Get plan limits for the user's subscription
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

      // Plan-based gating checks
      const planId = profile.subscription_status;

      let {
        subject_id,
        university_id,
        topic_id,
        total_questions,
      } = req.body;

      if (!subject_id || !university_id) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields: subject_id, university_id",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Explorer: max 2 subjects
      if (planId === "explorer" && planLimits.max_subjects) {
        const { data: usedSubjects, error: subjectError } = await supabaseAdmin
          .from("sessions")
          .select("subject_id")
          .eq("user_id", user.id)
          .eq("completed", true);

        const uniqueSubjects = new Set(usedSubjects?.map((s: any) => s.subject_id) || []);
        if (uniqueSubjects.size >= planLimits.max_subjects && !uniqueSubjects.has(subject_id)) {
          res.status(402).json({
            status: "error",
            message: `Subject limit reached. Explorer plan allows ${planLimits.max_subjects} subjects. Upgrade to Scholar or Elite for unlimited subjects.`,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      let questionLimit = 20;
      if (total_questions === "all" || total_questions === 0) {
        questionLimit = 0;
      } else {
        const parsed = typeof total_questions === "string" ? parseInt(total_questions, 10) : total_questions;
        questionLimit = Math.min(Math.max(parsed, 10), 50);
      }

      // Apply daily question limit if plan specifies one
      if (planLimits.daily_question_limit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: todaySessions, error: dailyError } = await supabaseAdmin
          .from("sessions")
          .select("total_questions")
          .eq("user_id", user.id)
          .gte("started_at", today.toISOString());

        const questionsAnsweredToday = todaySessions?.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0) || 0;
        const remaining = Math.max(0, planLimits.daily_question_limit - questionsAnsweredToday);

        if (remaining === 0) {
          res.status(402).json({
            status: "error",
            message: `Daily question limit reached. You can answer ${planLimits.daily_question_limit} questions per day. Try again tomorrow.`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (questionLimit === 0) {
          questionLimit = remaining;
        } else {
          questionLimit = Math.min(questionLimit, remaining);
        }
      }

      let idQuery = supabaseAdmin
        .from("questions")
        .select("id")
        .eq("subject_id", subject_id)
        .eq("university_id", university_id);

      if (topic_id) {
        idQuery = idQuery.eq("topic_id", topic_id);
      }

      const { data: questionIds, error: idError } = await idQuery;

      if (idError || !questionIds?.length) {
        res.status(404).json({
          status: "error",
          message: "No questions found matching the selected criteria",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Question deduplication: prefer unseen questions from last 5 sessions
      const { data: recentSessions } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("subject_id", subject_id)
        .eq("university_id", university_id)
        .order("created_at", { ascending: false })
        .limit(5);

      const recentSessionIds = recentSessions?.map((s: any) => s.id) ?? [];
      let seenIds = new Set<string>();
      if (recentSessionIds.length > 0) {
        const { data: recentAnswers } = await supabaseAdmin
          .from("session_answers")
          .select("question_id")
          .in("session_id", recentSessionIds);
        recentAnswers?.forEach((a: any) => seenIds.add(a.question_id));
      }

      const unseenIds = questionIds.filter((q: any) => !seenIds.has(q.id));
      const poolToShuffle = unseenIds.length >= (questionLimit || 1) ? unseenIds : questionIds;

      const shuffled = shuffleArray(poolToShuffle);
      const selectedIds = questionLimit === 0
        ? shuffled.map((q: any) => q.id)
        : shuffled.slice(0, questionLimit).map((q: any) => q.id);

      const { data: questions, error: qError } = await supabaseAdmin
        .from("questions")
        .select("id, body, subject_id, university_id, topic_id, passage_id, question_group_id, options(id, label, body), passages(id, title, body)")
        .in("id", selectedIds);

      if (qError || !questions) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: session, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .insert({
          user_id: user.id,
          subject_id,
          university_id,
          total_questions: questions.length,
          score: 0,
          completed: false,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error("[sessions/start] Failed to create session:", sessionError);
        res.status(500).json({
          status: "error",
          message: "Failed to create session",
          details: sessionError?.message || "Unknown error",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const sanitizedQuestions = questions.map((q: any) => {
        const { explanation, ...questionRest } = q;
        return {
          ...questionRest,
          options: q.options?.map(({ is_correct, ...opt }: any) => opt) || [],
        };
      });

      const fetchPromises: any = [
        supabaseAdmin
          .from("subjects")
          .select("*")
          .eq("id", subject_id)
          .single(),
        supabaseAdmin
          .from("universities")
          .select("*")
          .eq("id", university_id)
          .single(),
      ];

      if (topic_id) {
        fetchPromises.push(
          supabaseAdmin
            .from("topics")
            .select("*")
            .eq("id", topic_id)
            .single()
        );
      }

      const results = await Promise.all(fetchPromises);
      const { data: subjectData } = results[0];
      const { data: universityData } = results[1];
      const topicData = results[2] ? results[2].data : null;

      const responseData: any = {
        session_id: session.id,
        questions: sanitizedQuestions,
        subject: subjectData,
        university: universityData,
        total_questions: questions.length,
      };

      if (topicData) {
        responseData.topic = topicData;
      }

      res.status(201).json({
        status: "success",
        data: responseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/start] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/sessions/history
  app.get("/api/sessions/history", async (req: Request, res: Response) => {
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

      const { data: sessions, error } = await supabaseAdmin
        .from("sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const enriched = await Promise.all(
        (sessions ?? []).map(async (session: any) => {
          const [subjectRes, uniRes, topicRes] = await Promise.all([
            session.subject_id
              ? supabaseAdmin
                  .from("subjects")
                  .select("name, colour_token")
                  .eq("id", session.subject_id)
                  .single()
              : Promise.resolve({ data: null }),
            session.university_id
              ? supabaseAdmin
                  .from("universities")
                  .select("name, short_code")
                  .eq("id", session.university_id)
                  .single()
              : Promise.resolve({ data: null }),
            session.topic_id
              ? supabaseAdmin
                  .from("topics")
                  .select("name")
                  .eq("id", session.topic_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...session,
            subject_name: subjectRes.data?.name ?? null,
            subject_colour_token: subjectRes.data?.colour_token ?? null,
            university_name: uniRes.data?.name ?? null,
            university_short_code: uniRes.data?.short_code ?? null,
            topic_name: topicRes.data?.name ?? null,
            percentage:
              session.total_questions > 0
                ? Math.round((session.score / session.total_questions) * 100)
                : 0,
          };
        })
      );

      res.json({
        status: "success",
        data: enriched,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/history] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/sessions/wrong-questions - Get all questions user got wrong (must be before :id route)
  app.get("/api/sessions/wrong-questions", async (req: Request, res: Response) => {
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

      console.log("[wrong-questions] Fetching for user:", user.id);

      // Get user's sessions first
      const { data: userSessions, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessionError) {
        console.error("[wrong-questions] Session fetch error:", sessionError);
      }

      console.log("[wrong-questions] User sessions:", userSessions?.length || 0);

      if (sessionError || !userSessions) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch sessions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userSessionIds = userSessions.map((s: any) => s.id);

      if (userSessionIds.length === 0) {
        console.log("[wrong-questions] No sessions found");
        res.json({
          status: "success",
          data: { questions: [], total: 0 },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log("[wrong-questions] Fetching wrong answers from", userSessionIds.length, "sessions");

      // Get all answers (correct and wrong) with session timestamps
      const { data: allAnswers, error: answersError } = await supabaseAdmin
        .from("session_answers")
        .select("question_id, is_correct, sessions(created_at)")
        .in("session_id", userSessionIds)
        .order("question_id");

      if (answersError) {
        console.error("[wrong-questions] Answers fetch error:", answersError);
      }

      console.log("[wrong-questions] All answers found:", allAnswers?.length || 0);

      if (answersError || !allAnswers) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch answers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Build a map of each question's most recent answer
      const latestAnswerMap = new Map<string, { is_correct: boolean; created_at: string }>();
      allAnswers.forEach((answer: any) => {
        const sessionData = answer.sessions || {};
        const createdAt = sessionData.created_at || new Date().toISOString();
        const existing = latestAnswerMap.get(answer.question_id);

        // Keep the most recent answer
        if (!existing || createdAt > existing.created_at) {
          latestAnswerMap.set(answer.question_id, {
            is_correct: answer.is_correct,
            created_at: createdAt,
          });
        }
      });

      // Filter for questions that were answered wrong at least once AND whose most recent answer is incorrect
      const questionMap = new Map<
        string,
        { times_wrong: number; last_seen_at: string }
      >();
      allAnswers.forEach((answer: any) => {
        if (!answer.is_correct) {
          const sessionData = answer.sessions || {};
          const createdAt = sessionData.created_at || new Date().toISOString();
          const existing = questionMap.get(answer.question_id);
          const newData = {
            times_wrong: (existing?.times_wrong ?? 0) + 1,
            last_seen_at: createdAt,
          };
          // Keep the latest wrong answer date
          if (!existing || createdAt > existing.last_seen_at) {
            questionMap.set(answer.question_id, newData);
          }
        }
      });

      // Filter out questions where the most recent answer is correct
      const uniqueQuestionIds = Array.from(questionMap.keys()).filter((questionId) => {
        const latestAnswer = latestAnswerMap.get(questionId);
        // Include only if the most recent answer is incorrect
        return latestAnswer && !latestAnswer.is_correct;
      });
      console.log("[wrong-questions] Unique wrong question IDs:", uniqueQuestionIds.length);

      if (uniqueQuestionIds.length === 0) {
        console.log("[wrong-questions] No wrong answers, returning empty");
        res.json({
          status: "success",
          data: { questions: [], total: 0 },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Limit to top 50 most recent wrong questions (sort by last_seen_at first)
      const sortedByRecency = Array.from(questionMap.entries())
        .sort(([, a], [, b]) => {
          const aTime = new Date(a.last_seen_at).getTime();
          const bTime = new Date(b.last_seen_at).getTime();
          return bTime - aTime; // Most recent first
        })
        .slice(0, 50)
        .map(([questionId]) => questionId);

      console.log("[wrong-questions] Limited to", sortedByRecency.length, "most recent wrong questions");

      // Fetch full question data with subject info using batch helper
      interface QuestionRow {
        id: string;
        subject_id: string;
        university_id: string;
        topic_id: string;
        body: string;
        options: any[];
      }

      const questions = await batchQuery<QuestionRow>(
        "questions",
        "id",
        sortedByRecency,
        "id, subject_id, university_id, topic_id, body, options(*)"
      );

      if (questions.length === 0) {
        console.error("[wrong-questions] Failed to fetch question details after batching");
        res.status(500).json({
          status: "error",
          message: "Failed to fetch question details",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch subject info for each question
      const subjectIds = [...new Set(questions.map((q: any) => q.subject_id))];
      const { data: subjects } = await supabaseAdmin
        .from("subjects")
        .select("id, name, colour_token")
        .in("id", subjectIds);

      const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s]));

      // Build response with metadata, strip is_correct from options
      const errorBankQuestions = questions.map((q: any) => {
        const metadata = questionMap.get(q.id);
        const subjectInfo = subjectMap.get(q.subject_id);
        return {
          id: q.id,
          subject_id: q.subject_id,
          university_id: q.university_id,
          topic_id: q.topic_id,
          body: q.body,
          times_wrong: metadata?.times_wrong ?? 1,
          last_seen_at: metadata?.last_seen_at ?? new Date().toISOString(),
          subject_name: subjectInfo?.name ?? "Unknown",
          subject_colour_token: subjectInfo?.colour_token ?? "#666666",
          options: q.options.map((o: any) => ({
            id: o.id,
            question_id: o.question_id,
            label: o.label,
            body: o.body,
          })),
        };
      });

      console.log("[wrong-questions] Returning", errorBankQuestions.length, "error bank questions");
      res.json({
        status: "success",
        data: { questions: errorBankQuestions, total: errorBankQuestions.length },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[wrong-questions] Unexpected error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/sessions/:id
  app.get("/api/sessions/:id", async (req: Request, res: Response) => {
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

      const { id } = req.params;
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (sessionError || !session) {
        res.status(404).json({
          status: "error",
          message: "Session not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // If session is completed, fetch the answers with question details
      let sessionWithAnswers = session;
      if (session.completed) {
        const { data: answers } = await supabaseAdmin
          .from("session_answers")
          .select("*, questions(*)")
          .eq("session_id", id);
        sessionWithAnswers = { ...session, session_answers: answers || [] };
      }

      res.json({
        status: "success",
        data: sessionWithAnswers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/sessions/:id/submit
  app.post("/api/sessions/:id/submit", async (req: Request, res: Response) => {
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

      const { id } = req.params;
      const { answers, time_taken_seconds } = req.body;

      // Debug logs - START
      console.log('[Submit] Session ID:', id);
      console.log('[Submit] Body keys:', Object.keys(req.body));
      console.log('[Submit] Answers received:', answers?.length);
      console.log('[Submit] First answer:', JSON.stringify(answers?.[0]));
      console.log('[Submit] Answers with selection:', answers?.filter((a: any) => a.selected_option_id !== null).length);
      // Debug logs - END

      const { data: session, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (sessionError || !session) {
        res.status(404).json({
          status: "error",
          message: "Session not found",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (session.completed) {
        res.status(400).json({
          status: "error",
          message: "Session already submitted",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const questionIds = answers.map((a: any) => a.question_id);
      const { data: correctOptions } = await supabaseAdmin
        .from("options")
        .select("id, question_id, is_correct, body, label")
        .in("question_id", questionIds)
        .eq("is_correct", true);

      const correctMap = new Map(
        correctOptions?.map((o: any) => [o.question_id, o]) ?? []
      );

      let score = 0;
      const sessionAnswerRows = answers.map((a: any) => {
        const correct = correctMap.get(a.question_id);
        const isCorrect =
          !!a.selected_option_id && a.selected_option_id === correct?.id;
        if (isCorrect) score++;

        return {
          session_id: id,
          question_id: a.question_id,
          selected_option_id: a.selected_option_id ?? null,
          is_correct: isCorrect,
          time_spent_seconds: a.time_spent_seconds ?? null,
        };
      });

      // Debug logs - SCORE
      console.log('[Submit] Calculated score:', score);
      console.log('[Submit] Total questions:', answers.length);

      const { error: insertError } = await supabaseAdmin
        .from("session_answers")
        .insert(sessionAnswerRows);

      if (insertError) {
        res.status(500).json({
          status: "error",
          message: "Failed to save answers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await supabaseAdmin
        .from("sessions")
        .update({
          score,
          time_taken_seconds: time_taken_seconds ?? null,
          completed: true,
          ended_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Update last_mock_exam_date if this is a mock exam
      if (session.is_mock) {
        const { error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ last_mock_exam_date: new Date().toISOString() })
          .eq("id", user.id);

        if (profileUpdateError) {
          console.warn("[sessions/:id/submit] Failed to update last_mock_exam_date:", profileUpdateError);
        }
      }

      const { data: questions } = await supabaseAdmin
        .from("questions")
        .select("id, body, explanation, options(*)")
        .in("id", questionIds);

      const questionMap = new Map(questions?.map((q: any) => [q.id, q]) ?? []);

      const detailedAnswers = answers.map((a: any) => {
        const correct = correctMap.get(a.question_id);
        const questionData = questionMap.get(a.question_id);
        return {
          question_id: a.question_id,
          question_body: questionData?.body ?? "",
          selected_option_id: a.selected_option_id ?? null,
          is_correct: a.selected_option_id === correct?.id,
          correct_option_id: correct?.id ?? null,
          explanation: questionData?.explanation ?? null,
          options: questionData?.options ?? [],
        };
      });

      res.json({
        status: "success",
        data: {
          score,
          total: session.total_questions,
          percentage: Math.round((score / session.total_questions) * 100),
          answers: detailedAnswers,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/:id/submit] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/stats/me
  app.get("/api/stats/me", async (req: Request, res: Response) => {
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

      const { data: sessions, error } = await supabaseAdmin
        .from("sessions")
        .select("id, score, total_questions, subject_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) {
        res.status(400).json({
          status: "error",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const totalSessions = sessions?.length ?? 0;
      const totalQuestionsAnswered =
        sessions?.reduce((sum, s: any) => sum + s.total_questions, 0) ?? 0;
      const bestScorePercentage =
        sessions?.length && (sessions as any[]).length > 0
          ? Math.max(
              ...(sessions as any[]).map((s: any) =>
                s.total_questions > 0
                  ? Math.round((s.score / s.total_questions) * 100)
                  : 0
              )
            )
          : 0;

      const subjectMap = new Map<
        string,
        { scores: number[]; total: number }
      >();
      for (const s of (sessions as any[]) ?? []) {
        if (!s.subject_id) continue;
        const existing = subjectMap.get(s.subject_id) ?? { scores: [], total: 0 };
        const pct =
          s.total_questions > 0
            ? Math.round((s.score / s.total_questions) * 100)
            : 0;
        existing.scores.push(pct);
        existing.total++;
        subjectMap.set(s.subject_id, existing);
      }

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

      res.json({
        status: "success",
        data: {
          total_sessions: totalSessions,
          total_questions_answered: totalQuestionsAnswered,
          best_score_percentage: bestScorePercentage,
          avg_score_by_subject: avgScoreBySubject,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[stats/me] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/sessions/mock/start - Start a mock PUTME exam (4 subjects, 25 questions each, 90 minutes)
  app.post("/api/sessions/mock/start", async (req: Request, res: Response) => {
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

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select("*")
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

      const { mode } = req.body;

      // Gate hard mode to Elite only
      if (mode === "hard" && profile.subscription_status !== "elite") {
        res.status(403).json({
          status: "error",
          message: "Hard mode mock exams are available for Elite members only",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check mock exam access based on subscription tier
      const planId = profile.subscription_status;

      // Explorer: max 1 mock exam
      if (planId === "explorer") {
        const { data: completedMocks, error: mockError } = await supabaseAdmin
          .from("sessions")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("is_mock", true)
          .eq("completed", true);

        if (!mockError && completedMocks && completedMocks.length >= 1) {
          res.status(402).json({
            status: "error",
            message: "Mock exam limit reached. You've used your 1 free mock exam. Upgrade to Scholar or Elite to practice more mocks.",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Scholar: max 3 mocks per 7-day rolling window
      if (planId === "scholar") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentMocks, error: mockError } = await supabaseAdmin
          .from("sessions")
          .select("id", { count: "exact" })
          .eq("user_id", user.id)
          .eq("is_mock", true)
          .eq("completed", true)
          .gte("started_at", sevenDaysAgo.toISOString());

        if (!mockError && recentMocks && recentMocks.length >= 3) {
          res.status(402).json({
            status: "error",
            message: "Mock exam limit reached. You can take 3 mocks per week. Try again in 7 days.",
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Elite users have unlimited mocks (no checks needed)

      if (!profile.target_university_id) {
        res.status(400).json({
          status: "error",
          message: "University not selected in profile",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!profile.subject_combination || profile.subject_combination.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Subject combination not selected",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Filter out "other" and get only actual subjects
      const realSubjectIds = profile.subject_combination.filter((id: string) => id !== "other");
      const hasOtherSubject = profile.subject_combination.includes("other");

      // Get the user's selected subjects (excluding "other")
      const { data: subjects, error: subjectsError } = await supabaseAdmin
        .from("subjects")
        .select("id, name, colour_token")
        .in("id", realSubjectIds);

      if (subjectsError || !subjects || subjects.length === 0) {
        res.status(500).json({
          status: "error",
          message: "No available subjects found. Please select subjects with available practice questions.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Require at least 3 subjects to be available
      if (subjects.length < 3) {
        res.status(400).json({
          status: "error",
          message: `Only ${subjects.length} subject(s) have available questions. Please select more subjects with available practice questions.`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch 25 questions per subject (100 total)
      let allQuestions: any[] = [];
      const questionsPerSubject = 25;

      // Questions currently flagged for review are excluded from mock exams
      // until an admin rectifies and clears the flag.
      const { data: flaggedRows } = await supabaseAdmin
        .from("flagged_questions")
        .select("question_id");
      const flaggedQuestionIds = new Set((flaggedRows || []).map((f: any) => f.question_id));

      for (const subject of subjects) {
        let query = supabaseAdmin
          .from("questions")
          .select("id")
          .eq("subject_id", subject.id)
          .eq("university_id", profile.target_university_id);

        // In hard mode, filter for medium and hard difficulty questions
        if (mode === "hard") {
          query = query.in("difficulty", ["medium", "hard"]);
        }

        const { data: rawQuestionIds, error: idError } = await query
          .limit(100); // Get more than needed to have options for shuffling

        const questionIds = (rawQuestionIds || []).filter(
          (q: any) => !flaggedQuestionIds.has(q.id)
        );

        if (idError || !questionIds.length) {
          res.status(404).json({
            status: "error",
            message: `No questions found for subject: ${subject.name}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Question deduplication: prefer unseen questions from last 5 mock sessions
        const { data: recentMockSessions } = await supabaseAdmin
          .from("sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_mock", true)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentMockSessionIds = recentMockSessions?.map((s: any) => s.id) ?? [];
        let seenMockIds = new Set<string>();
        if (recentMockSessionIds.length > 0) {
          const { data: recentMockAnswers } = await supabaseAdmin
            .from("session_answers")
            .select("question_id")
            .in("session_id", recentMockSessionIds)
            .eq("question_id", subject.id); // Filter by current subject
          recentMockAnswers?.forEach((a: any) => seenMockIds.add(a.question_id));
        }

        const unseenMockIds = questionIds.filter((q: any) => !seenMockIds.has(q.id));
        const mockPoolToShuffle = unseenMockIds.length >= questionsPerSubject ? unseenMockIds : questionIds;

        // Shuffle and select 25 questions
        const shuffled = shuffleArray(mockPoolToShuffle);
        const selectedIds = shuffled.slice(0, questionsPerSubject).map((q: any) => q.id);

        const { data: questions, error: qError } = await supabaseAdmin
          .from("questions")
          .select("*, options(*)")
          .in("id", selectedIds);

        if (qError || !questions) {
          res.status(500).json({
            status: "error",
            message: "Failed to fetch questions",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Add subject info to each question
        allQuestions = allQuestions.concat(
          questions.map((q: any) => ({
            ...q,
            subject_name: subject.name,
            subject_colour_token: subject.colour_token,
          }))
        );
      }

      // Create session record
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .insert({
          user_id: user.id,
          subject_id: null, // Multiple subjects
          university_id: profile.target_university_id,
          total_questions: allQuestions.length,
          score: 0,
          completed: false,
          is_mock: true,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error("[sessions/mock/start] Failed to create session:", sessionError);
        res.status(500).json({
          status: "error",
          message: "Failed to create mock session",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update last_mock_exam_date for explorer users to track monthly limit
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ last_mock_exam_date: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        console.warn("[sessions/mock/start] Failed to update last_mock_exam_date:", updateError);
        // Don't fail the request, just log the warning
      }

      // Get university info
      const { data: university } = await supabaseAdmin
        .from("universities")
        .select("*")
        .eq("id", profile.target_university_id)
        .single();

      // Shuffle options for each question
      const questionsWithShuffledOptions = allQuestions.map((q: any) => ({
        id: q.id,
        subject_id: q.subject_id,
        university_id: q.university_id,
        topic_id: q.topic_id,
        topic_name: q.topic_name,
        subject_name: q.subject_name,
        subject_colour_token: q.subject_colour_token,
        body: q.body,
        options: q.options ? shuffleArray(q.options).map((o: any, index: number) => ({
          id: o.id,
          question_id: o.question_id,
          label: String.fromCharCode(65 + index),
          body: o.body,
        })) : [],
      }));

      // Calculate time proportionally: 90 minutes for normal, 60 for hard mode
      const baseMinutes = mode === "hard" ? 60 : 90;
      const timeLimitMinutes = Math.round((subjects.length / 4) * baseMinutes);

      res.status(201).json({
        status: "success",
        data: {
          session_id: session.id,
          questions: questionsWithShuffledOptions,
          subjects: subjects,
          university: university,
          total_questions: allQuestions.length,
          time_limit_minutes: timeLimitMinutes,
          questions_per_subject: questionsPerSubject,
          available_subjects_count: subjects.length,
          has_other_subjects: hasOtherSubject,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/mock/start] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // POST /api/sessions/error-bank/start - Start a practice session with wrong questions
  app.post("/api/sessions/error-bank/start", async (req: Request, res: Response) => {
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

      // Get user's profile for subscription status
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
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
        .select("error_bank_limit")
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

      const { question_ids } = req.body;

      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        res.status(400).json({
          status: "error",
          message: "question_ids must be a non-empty array",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const maxAllowed = planLimits.error_bank_limit || 500;
      if (question_ids.length > maxAllowed) {
        res.status(402).json({
          status: "error",
          message: `Error bank limit: you can retry up to ${maxAllowed} questions. Upgrade your plan for more.`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get user's sessions to verify wrong answers belong to them
      const { data: userSessions } = await supabaseAdmin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      const userSessionIds = userSessions?.map((s: any) => s.id) ?? [];

      if (userSessionIds.length === 0) {
        res.status(403).json({
          status: "error",
          message: "You have no sessions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Get wrong answers from user's sessions, respecting plan limits
      let wrongQuery = supabaseAdmin
        .from("session_answers")
        .select("question_id")
        .in("session_id", userSessionIds)
        .eq("is_correct", false)
        .order("created_at", { ascending: false });

      if (planLimits.error_bank_limit) {
        wrongQuery = wrongQuery.limit(planLimits.error_bank_limit);
      }

      const { data: wrongAnswers, error: wrongError } = await wrongQuery;

      if (wrongError) {
        console.error("[error-bank/start] Wrong answers query error:", wrongError);
        res.status(500).json({
          status: "error",
          message: "Failed to verify wrong answers",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!wrongAnswers || wrongAnswers.length === 0) {
        res.status(400).json({
          status: "error",
          message: "You have no wrong answers yet",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const validIds = wrongAnswers.map((a: any) => a.question_id);
      const allValid = question_ids.every((id: string) => validIds.includes(id));

      if (!allValid) {
        res.status(403).json({
          status: "error",
          message: "One or more questions are not in your error bank",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch full question data
      const { data: questions, error: qError } = await supabaseAdmin
        .from("questions")
        .select("*, options(*)")
        .in("id", question_ids);

      if (qError || !questions) {
        res.status(500).json({
          status: "error",
          message: "Failed to fetch questions",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create session for error bank
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("sessions")
        .insert({
          user_id: user.id,
          total_questions: questions.length,
          completed: false,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sessionError) {
        console.error("[error-bank/start] Session creation error:", sessionError);
        res.status(500).json({
          status: "error",
          message: "Failed to create session",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!session) {
        console.error("[error-bank/start] No session returned from insert");
        res.status(500).json({
          status: "error",
          message: "Failed to create session",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Shuffle and strip sensitive data
      const shuffledQuestions = shuffleArray(questions);
      const questionsForClient = shuffledQuestions.map((q: any) => ({
        id: q.id,
        subject_id: q.subject_id,
        university_id: q.university_id,
        topic_id: q.topic_id,
        body: q.body,
        options: q.options ? q.options.map((o: any) => ({
          id: o.id,
          question_id: o.question_id,
          label: o.label,
          body: o.body,
        })) : [],
      }));

      res.json({
        status: "success",
        data: {
          session_id: session.id,
          questions: questionsForClient,
          total_questions: questions.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[sessions/error-bank/start] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
