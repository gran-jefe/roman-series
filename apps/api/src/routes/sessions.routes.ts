import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { shuffleArray } from "../utils/helpers";

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

      let questionLimit = 20;
      if (total_questions === "all" || total_questions === 0) {
        questionLimit = 0;
      } else {
        const parsed = typeof total_questions === "string" ? parseInt(total_questions, 10) : total_questions;
        questionLimit = Math.min(Math.max(parsed, 10), 50);
      }

      if (profile.subscription_status === "free") {
        questionLimit = Math.min(questionLimit || 10, 10);
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

      const shuffled = shuffleArray(questionIds);
      const selectedIds = questionLimit === 0
        ? shuffled.map((q: any) => q.id)
        : shuffled.slice(0, questionLimit).map((q: any) => q.id);

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
        };
      });

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
}
