import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { resolveUserFromToken } from "../middleware/requireAuth";

interface UploadDeps {
  supabaseAdmin: SupabaseClient;
}

async function checkAdminAuth(
  req: Request,
  res: Response,
  supabaseAdmin: SupabaseClient
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      message: "Missing or invalid Authorization header",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  const token = authHeader.substring(7);
  const resolved = await resolveUserFromToken(token, supabaseAdmin).catch(() => null);

  if (!resolved) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  if (resolved.userRole !== "admin") {
    res.status(403).json({
      status: "error",
      message: "Admin access required",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return resolved.userId;
}

const optionSchema = z.object({
  label: z.string(),
  body: z.string(),
  is_correct: z.boolean().optional().default(false),
});

const passageSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const questionSchema = z.object({
  number: z.number(),
  body: z.string(),
  explanation: z.string().nullable().optional(),
  answer: z.enum(["A", "B", "C", "D", "E"]).nullable().optional(),
  options: z.array(optionSchema),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  passage_title: z.string().optional(),
  group_id: z.string().optional(),
});

const topicSchema = z.object({
  name: z.string(),
  passage: passageSchema.optional(),
  questions: z.array(questionSchema),
});

const uploadSchema = z.object({
  subject: z.string(),
  university: z.string(),
  topics: z.array(topicSchema),
});

const subjectColours: Record<string, string> = {
  Biology: "#1A7A4A",
  Chemistry: "#8B2252",
  Physics: "#7B4F1A",
  Government: "#1E3A5F",
  Literature: "#C4522A",
  "Use of English": "#2166B2",
  "C.R.S.": "#D97B20",
  "I.R.S.": "#B0287A",
};

export function registerUploadRoutes(app: Express, deps: UploadDeps) {
  const { supabaseAdmin } = deps;

  app.post("/api/admin/upload-json", async (req: Request, res: Response) => {
    const userId = await checkAdminAuth(req, res, supabaseAdmin);
    if (!userId) return;

    try {
      const validation = uploadSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          status: "error",
          message: "Invalid request body",
          details: validation.error.errors,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { subject, university: universityCode, topics } = validation.data;

      // Get university by code
      const { data: universityData, error: uniError } = await supabaseAdmin
        .from("universities")
        .select("id")
        .eq("short_code", universityCode)
        .single();

      if (uniError || !universityData) {
        res.status(400).json({
          status: "error",
          message: `University with code "${universityCode}" not found`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const universityId = universityData.id;

      // Get subject by name (subjects are global, not per-university)
      let { data: subjectData, error: subjError } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .eq("name", subject)
        .single();

      // Auto-create subject if not found
      if (subjError || !subjectData) {
        const { data: newSubject, error: createError } = await supabaseAdmin
          .from("subjects")
          .insert({
            name: subject,
            colour_token: subjectColours[subject] || "#7B68EE",
          })
          .select("id")
          .single();

        if (createError || !newSubject) {
          console.error(`[upload-json] Failed to create subject "${subject}":`, createError);
          res.status(500).json({
            status: "error",
            message: `Failed to create subject "${subject}"`,
            details: createError?.message || "Unknown error",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        subjectData = newSubject;
      }

      const subjectId = subjectData.id;

      // Validate topics structure
      if (!Array.isArray(topics) || topics.length === 0) {
        res.status(400).json({
          status: "error",
          message: "Topics array is required and must not be empty",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let totalTopics = 0;
      let totalQuestions = 0;
      let totalSkipped = 0;

      // Process each topic
      for (const topic of topics) {
        if (!topic.name || !Array.isArray(topic.questions)) {
          console.warn(`[upload-json] Skipping invalid topic structure`);
          continue;
        }
        // First try to find existing topic
        let { data: topicRow } = await supabaseAdmin
          .from("topics")
          .select("id")
          .eq("name", topic.name)
          .eq("subject_id", subjectId)
          .single();

        // If not found, insert it
        if (!topicRow) {
          const { data: newTopic, error: insertError } = await supabaseAdmin
            .from("topics")
            .insert({
              name: topic.name,
              subject_id: subjectId,
              university_id: universityId,
            })
            .select("id")
            .single();

          if (insertError || !newTopic) {
            console.error(`[upload-json] Failed to create topic "${topic.name}":`, insertError);
            res.status(500).json({
              status: "error",
              message: `Failed to create topic "${topic.name}"`,
              details: insertError?.message || "Unknown error",
              timestamp: new Date().toISOString(),
            });
            return;
          }

          topicRow = newTopic;
        }

        const topicId = topicRow.id;
        totalTopics++;

        // Create passage if topic has one
        let passageId: string | null = null;
        if (topic.passage) {
          const { data: passageData, error: passageError } = await supabaseAdmin
            .from("passages")
            .insert({
              subject_id: subjectId,
              topic_id: topicId,
              title: topic.passage.title,
              body: topic.passage.body,
            })
            .select("id")
            .single();

          if (passageError || !passageData) {
            console.warn(`[upload-json] Failed to create passage for topic "${topic.name}":`, passageError);
          } else {
            passageId = passageData.id;
            console.log(`[upload-json] Created passage "${topic.passage.title}" for topic "${topic.name}"`);
          }
        }

        // Bulk insert questions - preserve mapping to source questions
        const questionsWithMapping = topic.questions
          .map((q, idx) => ({ q, idx }))
          .filter(({ q }) => {
            // Skip if no answer
            if (q.answer === null) return false;
            // Skip if options array is invalid or has no correct option
            if (!Array.isArray(q.options) || q.options.length === 0) return false;
            const hasCorrectOption = q.options.some((opt) => opt.is_correct === true);
            if (!hasCorrectOption) {
              console.warn(`[upload-json] Question skipped: answer "${q.answer}" but no option marked is_correct`);
              return false;
            }
            return true;
          })
          .map(({ q, idx }) => ({
            data: {
              topic_id: topicId,
              subject_id: subjectId,
              university_id: universityId,
              body: q.body,
              explanation: q.explanation,
              difficulty: q.difficulty || "medium",
              passage_id: passageId,
              question_group_id: q.group_id || null,
            },
            sourceIndex: idx,
          }));

        totalSkipped += topic.questions.length - questionsWithMapping.length;

        if (questionsWithMapping.length === 0) continue;

        const { data: insertedQuestions, error: questionsError } = await supabaseAdmin
          .from("questions")
          .insert(questionsWithMapping.map((q) => q.data))
          .select("id");

        if (questionsError || !insertedQuestions || insertedQuestions.length === 0) {
          console.error(`[upload-json] Failed to insert questions for topic "${topic.name}":`, questionsError);
          res.status(500).json({
            status: "error",
            message: `Failed to insert questions for topic "${topic.name}"`,
            details: questionsError?.message || "No questions inserted",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        totalQuestions += insertedQuestions.length;

        // Bulk insert options
        const optionsToInsert: any[] = [];
        for (let i = 0; i < insertedQuestions.length; i++) {
          const questionId = insertedQuestions[i].id;
          const sourceQuestionIndex = questionsWithMapping[i].sourceIndex;
          const sourceQuestion = topic.questions[sourceQuestionIndex];

          sourceQuestion.options.forEach((option) => {
            optionsToInsert.push({
              question_id: questionId,
              label: option.label,
              body: option.body,
              is_correct: option.is_correct ?? false,
            });
          });
        }

        if (optionsToInsert.length > 0) {
          const { error: optionsError } = await supabaseAdmin
            .from("options")
            .insert(optionsToInsert);

          if (optionsError) {
            console.error(`[upload-json] Failed to insert options for topic "${topic.name}":`, optionsError);
            res.status(500).json({
              status: "error",
              message: `Failed to insert options for topic "${topic.name}"`,
              details: optionsError?.message || "Unknown error",
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      res.json({
        status: "success",
        data: {
          total_topics: totalTopics,
          total_questions: totalQuestions,
          total_skipped: totalSkipped,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[upload-json] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
