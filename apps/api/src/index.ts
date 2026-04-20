import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import multer from "multer";
import mammoth from "mammoth";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// ============ Question Parser (inlined to avoid ESM resolution issues) ============
interface ParsedOption {
  label: 'A' | 'B' | 'C' | 'D' | 'E';
  body: string;
  is_correct: boolean;
}

interface ParsedQuestion {
  body: string;
  options: ParsedOption[];
  explanation: string | null;
  topic: string;
  topic_name: string;
  question_number: number;
}

interface ParseResult {
  questions: ParsedQuestion[];
  topics: string[];
  total_parsed: number;
  total_matched: number;
  total_unmatched: number;
  errors: string[];
}

function parseRomanSeriesDocument(text: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  // STEP 1: Split into questions and solutions sections
  const solutionsIndex = text.toUpperCase().indexOf('SOLUTIONS');
  if (solutionsIndex === -1) {
    errors.push('SOLUTIONS section not found in document');
    return { questions: [], topics: [], total_parsed: 0, total_matched: 0, total_unmatched: 0, errors };
  }

  const questionsSection = text.substring(0, solutionsIndex);
  const solutionsSection = text.substring(solutionsIndex);

  // STEP 2: Parse questions section
  const parsedQuestions = parseQuestionsSection(questionsSection, errors);

  // STEP 3: Parse solutions section
  const solutionsMap = parseSolutionsSection(solutionsSection);

  // STEP 4: Match questions with solutions
  const matchedQuestions: ParsedQuestion[] = [];
  for (const q of parsedQuestions) {
    const solution = solutionsMap.get(`${q.topic}|${q.question_number}`);
    if (solution) {
      const updatedQuestion = { ...q };
      updatedQuestion.options = q.options.map(opt => ({
        ...opt,
        is_correct: opt.label === solution.correctLetter,
      }));
      updatedQuestion.explanation = solution.explanation;
      matchedQuestions.push(updatedQuestion);
    } else {
      matchedQuestions.push(q);
    }
  }

  // STEP 5: Extract unique topics
  const uniqueTopics = Array.from(new Set(matchedQuestions.map(q => q.topic_name)));

  // STEP 6: Return results
  const totalMatched = matchedQuestions.filter(q =>
    q.options.some(opt => opt.is_correct)
  ).length;

  return {
    questions: matchedQuestions,
    topics: uniqueTopics,
    total_parsed: matchedQuestions.length,
    total_matched: totalMatched,
    total_unmatched: matchedQuestions.length - totalMatched,
    errors,
  };
}

function parseQuestionsSection(text: string, errors: string[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = text.split('\n');

  let currentTopic = 'General';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for topic heading (all caps, no number at start)
    if (line && /^[A-Z][A-Z\s:]+$/.test(line) && !/^\d+/.test(line)) {
      currentTopic = line.replace(/[:\s]+$/, '').trim();
      i++;
      continue;
    }

    // Check for question number
    if (/^\d+[.\)]/.test(line)) {
      const questionStart = i;
      const match = line.match(/^(\d+)[.\)]\s?(.*)$/);
      if (match) {
        const questionNumber = parseInt(match[1], 10);
        const firstLineText = match[2];

        // Collect question body lines
        const bodyLines: string[] = firstLineText ? [firstLineText] : [];
        i++;

        while (i < lines.length) {
          const currentLine = lines[i].trim();
          if (!currentLine) {
            i++;
            continue;
          }
          // Stop if we hit next question number or a topic heading
          if (/^\d+[.\)]/.test(currentLine) || (/^[A-Z][A-Z\s:]+$/.test(currentLine) && !/^\d+/.test(currentLine))) {
            break;
          }
          // Stop if we hit options
          if (/^[A-E]\.\s/.test(currentLine)) {
            break;
          }
          bodyLines.push(currentLine);
          i++;
        }

        // Parse options
        const options: ParsedOption[] = [];
        while (i < lines.length) {
          const currentLine = lines[i].trim();
          if (!currentLine) {
            i++;
            continue;
          }
          const optMatch = currentLine.match(/^([A-E])\.\s+(.+)$/);
          if (optMatch) {
            const [, label, body] = optMatch;
            options.push({
              label: label as 'A' | 'B' | 'C' | 'D' | 'E',
              body: body.trim(),
              is_correct: false,
            });
            i++;
          } else {
            break;
          }
        }

        // Create question if we have at least 4 options and body
        if (bodyLines.length > 0 && options.length >= 4) {
          questions.push({
            body: bodyLines.join(' ').trim(),
            options: options.slice(0, 5),
            explanation: null,
            topic: currentTopic,
            topic_name: currentTopic,
            question_number: questionNumber,
          });
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return questions;
}

function parseSolutionsSection(text: string): Map<string, { correctLetter: string; explanation: string }> {
  const solutionsMap = new Map<string, { correctLetter: string; explanation: string }>();
  const lines = text.split('\n');

  let currentTopic = 'General';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for topic heading
    if (line && /^[A-Z][A-Z\s:]+$/.test(line) && !/^\d+/.test(line)) {
      currentTopic = line.replace(/[:\s]+$/, '').trim();
      i++;
      continue;
    }

    // Check for solution number
    if (/^\d+[.\)]/.test(line)) {
      const match = line.match(/^(\d+)[.\)]\s?(.*)$/);
      if (match) {
        const questionNumber = parseInt(match[1], 10);
        const firstLineText = match[2];

        // Collect all solution lines
        const solutionLines: string[] = firstLineText ? [firstLineText] : [];
        i++;

        while (i < lines.length) {
          const currentLine = lines[i].trim();
          if (!currentLine) {
            i++;
            continue;
          }
          // Stop if we hit next question number or a topic heading
          if (/^\d+[.\)]/.test(currentLine) || (/^[A-Z][A-Z\s:]+$/.test(currentLine) && !/^\d+/.test(currentLine))) {
            break;
          }
          solutionLines.push(currentLine);
          i++;
        }

        // Extract correct answer and explanation
        const fullText = solutionLines.join(' ');

        // Try multiple patterns to extract answer letter
        let correctLetter = '';

        // Pattern 1: "A IS CORRECT", "B is correct"
        const pattern1 = /\b([A-E])\s+(?:IS\s+)?CORRECT\b/i;
        const match1 = fullText.match(pattern1);
        if (match1) {
          correctLetter = match1[1].toUpperCase();
        }

        // Pattern 2: "ANSWER: A", "ANSWER: B"
        if (!correctLetter) {
          const pattern2 = /ANSWER[:\s]+([A-E])/i;
          const match2 = fullText.match(pattern2);
          if (match2) {
            correctLetter = match2[1].toUpperCase();
          }
        }

        // Pattern 3: Start of solution "A-" or "A. " or "A "
        if (!correctLetter) {
          const pattern3 = /^([A-E])[-.\s]/;
          const match3 = fullText.match(pattern3);
          if (match3) {
            correctLetter = match3[1].toUpperCase();
          }
        }

        if (correctLetter) {
          solutionsMap.set(`${currentTopic}|${questionNumber}`, {
            correctLetter,
            explanation: fullText,
          });
        }
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return solutionsMap;
}

// import authRoutes from "./routes/auth.routes.ts";
// import universitiesRoutes from "./routes/universities.routes.ts";

dotenv.config();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Zod schemas for validation
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required").max(100),
  target_university_id: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const app: Express = express();
const port = process.env.PORT || 4000;
const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean);

app.options('*', cors());

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later." },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many auth attempts, please try again in 15 minutes." },
});

// Routes
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Roman Series API",
    version: "0.1.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/*",
    },
  });
});

// Auth routes (inlined to work around ts-node ESM module issues)
app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        status: "error",
        message: validation.error.errors[0].message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { full_name, email, password, target_university_id } = validation.data;

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      res.status(400).json({
        status: "error",
        message: authError?.message || "Failed to create user",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name,
        target_university_id: target_university_id || null,
        role: "student",
        subscription_status: "free",
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      res.status(400).json({
        status: "error",
        message: "Failed to create user profile",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Note: Email verification is currently disabled. Enable in production.

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      message: "User created successfully. Check your email to verify your account.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/register] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        status: "error",
        message: validation.error.errors[0].message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { email, password } = validation.data;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      res.status(401).json({
        status: "error",
        message: error?.message || "Invalid email or password",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      res.status(500).json({
        status: "error",
        message: "Failed to fetch user profile",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: "success",
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        profile: profile,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/login] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/auth/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await supabaseAdmin.auth.admin.signOut(user.id);

    res.json({
      status: "success",
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/logout] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/auth/refresh", async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        status: "error",
        message: "Missing required field: refresh_token",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      res.status(401).json({
        status: "error",
        message: "Failed to refresh session",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: "success",
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/refresh] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/api/auth/forgot-password", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        status: "error",
        message: "Missing required field: email",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${webUrl}/reset-password`,
    });

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
      message: "Password reset email sent. Check your email for further instructions.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/forgot-password] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
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

    let profileData: any = profile;

    if (profileData.target_university_id) {
      const { data: university } = await supabaseAdmin
        .from("universities")
        .select("*")
        .eq("id", profileData.target_university_id)
        .single();

      profileData = {
        ...profileData,
        target_university: university,
      };
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profileData,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[auth/me] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Universities endpoint (inline for now)
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

    // Mark UI as available, others as locked
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

// ============================================================================
// TOPICS ROUTES
// ============================================================================

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

// ============================================================================
// QUESTION & PRACTICE ROUTES (inlined to work around ts-node ESM module issues)
// ============================================================================

// Helper: Fisher-Yates shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// GET /api/subjects - Fetch all subjects with optional question counts
app.get("/api/subjects", async (req: Request, res: Response) => {
  try {
    const { universityId } = req.query;

    const { data: subjects, error } = await supabaseAdmin
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

    // Get question count for each subject (parallel queries)
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (subject) => {
        let countQuery = supabaseAdmin
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("subject_id", subject.id);

        if (universityId) {
          countQuery = countQuery.eq("university_id", universityId as string);
        }

        const { count } = await countQuery;
        return { ...subject, question_count: count ?? 0 };
      })
    );

    // Filter out subjects with 0 questions if university is specified
    const filtered = universityId
      ? subjectsWithCounts.filter((s) => s.question_count > 0)
      : subjectsWithCounts;

    res.json({
      status: "success",
      data: filtered,
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

// GET /api/questions - Paginated question list
app.get("/api/questions", async (req: Request, res: Response) => {
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

    const {
      subjectId,
      universityId,
      year,
      page = "1",
      perPage = "20",
    } = req.query;
    const pageNum = parseInt(page as string, 10);
    const perPageNum = Math.min(parseInt(perPage as string, 10), 100);
    const from = (pageNum - 1) * perPageNum;
    const to = from + perPageNum - 1;

    let query = supabaseAdmin
      .from("questions")
      .select("*, options(*)", { count: "exact" })
      .range(from, to)
      .order("created_at", { ascending: false });

    if (subjectId) query = query.eq("subject_id", subjectId as string);
    if (universityId) query = query.eq("university_id", universityId as string);
    if (year) query = query.eq("year", parseInt(year as string, 10));

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Strip is_correct for students
    const isAdmin = profile.role === "admin";
    const sanitized = isAdmin
      ? data
      : data?.map((q: any) => ({
          ...q,
          options: q.options.map(({ is_correct, ...opt }: any) => opt),
        }));

    res.json({
      status: "success",
      data: sanitized,
      pagination: {
        page: pageNum,
        per_page: perPageNum,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / perPageNum),
      },
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

// GET /api/questions/:id - Single question
app.get("/api/questions/:id", async (req: Request, res: Response) => {
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

    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("*, options(*)")
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

    const isAdmin = profile.role === "admin";
    const result = isAdmin
      ? data
      : {
          ...data,
          explanation: undefined,
          options: data.options.map(({ is_correct, ...opt }: any) => opt),
        };

    res.json({
      status: "success",
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[question/:id] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/sessions/start - Start a practice session
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

    // Handle total_questions - can be 10, 20, 30, 40, 50, or 'all'/0 for all questions
    let questionLimit = 20; // default
    if (total_questions === "all" || total_questions === 0) {
      questionLimit = 0; // 0 means fetch all
    } else {
      const parsed = typeof total_questions === "string" ? parseInt(total_questions, 10) : total_questions;
      questionLimit = Math.min(Math.max(parsed, 10), 50); // clamp between 10 and 50
    }

    // Free user cap at 10 questions
    if (profile.subscription_status === "free") {
      questionLimit = Math.min(questionLimit || 10, 10);
    }

    // Fetch all matching question IDs
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

    // Shuffle and select random questions
    const shuffled = shuffleArray(questionIds);
    const selectedIds = questionLimit === 0
      ? shuffled.map((q: any) => q.id)
      : shuffled.slice(0, questionLimit).map((q: any) => q.id);

    // Fetch full question data
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

    // Create session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({
        user_id: user.id,
        subject_id,
        university_id,
        topic_id: topic_id || null,
        total_questions: questions.length,
        score: 0,
        completed: false,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      res.status(500).json({
        status: "error",
        message: "Failed to create session",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Strip is_correct and explanation from questions
    const sanitizedQuestions = questions.map((q: any) => {
      const { explanation, ...questionRest } = q;
      return {
        ...questionRest,
        options: q.options?.map(({ is_correct, ...opt }: any) => opt) || [],
      };
    });

    // Fetch subject, university, and topic
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
    const { data: subject } = results[0];
    const { data: university } = results[1];
    const topic = results[2] ? results[2].data : null;

    const responseData: any = {
      session_id: session.id,
      questions: sanitizedQuestions,
      subject,
      university,
      total_questions: questions.length,
    };

    if (topic) {
      responseData.topic = topic;
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

// GET /api/sessions/history - User's session history (must be before /:id route)
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

    // Enrich with subject, university, and colour token
    const enriched = await Promise.all(
      (sessions ?? []).map(async (session: any) => {
        const [subjectRes, uniRes] = await Promise.all([
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
        ]);

        return {
          ...session,
          subject_name: subjectRes.data?.name ?? null,
          subject_colour_token: subjectRes.data?.colour_token ?? null,
          university_name: uniRes.data?.name ?? null,
          university_short_code: uniRes.data?.short_code ?? null,
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

// POST /api/sessions/:id/submit - Submit session answers
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

    const { id } = req.params;
    const { answers, time_taken_seconds } = req.body;

    // Verify session ownership and status
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

    // Fetch correct options
    const questionIds = answers.map((a: any) => a.question_id);
    const { data: correctOptions } = await supabaseAdmin
      .from("options")
      .select("id, question_id, is_correct, body, label")
      .in("question_id", questionIds)
      .eq("is_correct", true);

    const correctMap = new Map(
      correctOptions?.map((o: any) => [o.question_id, o]) ?? []
    );

    // Calculate score and build session_answers rows
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

    // Insert session answers
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

    // Update session
    await supabaseAdmin
      .from("sessions")
      .update({
        score,
        time_taken_seconds: time_taken_seconds ?? null,
        completed: true,
        ended_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Fetch questions for detailed answer review
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, body, explanation, options(*)")
      .in("id", questionIds);

    const questionMap = new Map(questions?.map((q: any) => [q.id, q]) ?? []);

    // Build detailed answer response
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

// GET /api/sessions/:id - Get single session details (after history route)
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

    const { id } = req.params;

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*, session_answers(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !session) {
      res.status(404).json({
        status: "error",
        message: "Session not found",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // If completed, enrich with question details
    if (session.completed && session.session_answers?.length) {
      const questionIds = session.session_answers.map((a: any) => a.question_id);
      const { data: questions } = await supabaseAdmin
        .from("questions")
        .select("*, options(*)")
        .in("id", questionIds);

      const questionMap = new Map(
        questions?.map((q: any) => [q.id, q]) ?? []
      );

      const enrichedAnswers = session.session_answers.map((a: any) => ({
        ...a,
        question: questionMap.get(a.question_id) ?? null,
      }));

      return res.json({
        status: "success",
        data: { ...session, session_answers: enrichedAnswers },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: "success",
      data: session,
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

// GET /api/stats/me - User statistics
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

    // Fetch all completed sessions
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

    // Group by subject
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

    // Fetch subject names
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

    // Find weakest and strongest subjects
    let weakestSubject = null;
    let strongestSubject = null;
    if (avgScoreBySubject.length > 0) {
      weakestSubject = avgScoreBySubject.reduce((min, curr) =>
        curr.avg_percentage < min.avg_percentage ? curr : min
      );
      strongestSubject = avgScoreBySubject.reduce((max, curr) =>
        curr.avg_percentage > max.avg_percentage ? curr : max
      );
    }

    // Get last 5 session scores for trend
    const { data: recentSessions } = await supabaseAdmin
      .from("sessions")
      .select("score, total_questions")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("started_at", { ascending: false })
      .limit(5);

    const recentTrend = (recentSessions ?? [])
      .reverse()
      .map((s: any) =>
        s.total_questions > 0
          ? Math.round((s.score / s.total_questions) * 100)
          : 0
      );

    res.json({
      status: "success",
      data: {
        total_sessions: totalSessions,
        total_questions_answered: totalQuestionsAnswered,
        best_score_percentage: bestScorePercentage,
        avg_score_by_subject: avgScoreBySubject,
        weakest_subject: weakestSubject,
        strongest_subject: strongestSubject,
        recent_trend: recentTrend,
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

// GET /api/leaderboard - Leaderboard with optional filtering
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

    const { subjectId, universityId } = req.query;

    // Build query for top users by average score
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

    // Group by user_id and calculate average score
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

    // Calculate averages and sort
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

    // Fetch user profiles and universities
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

    // Build leaderboard response
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

// ============ PAYMENTS ENDPOINTS ============

// POST /api/payments/initiate - Initialize payment
app.post("/api/payments/initiate", async (req: Request, res: Response) => {
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { plan } = req.body;

    if (!plan || !["monthly", "per_university", "bundle"].includes(plan)) {
      res.status(400).json({
        status: "error",
        message: "Invalid plan. Must be 'monthly', 'per_university', or 'bundle'",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const pricing = {
      monthly: 200000,
      per_university: 150000,
      bundle: 500000,
    };

    const amount = pricing[plan as keyof typeof pricing];
    const reference = `RS-${user.id.slice(0, 8)}-${Date.now()}`;

    try {
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
      const paystackRes = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email: user.email,
          amount,
          reference,
          callback_url: `${webUrl}/payments/success?reference=${reference}`,
          metadata: { user_id: user.id, plan },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!paystackRes.data.status) {
        throw new Error("Paystack initialization failed");
      }

      // Insert into subscriptions table
      await supabaseAdmin.from("subscriptions").insert({
        user_id: user.id,
        plan,
        status: "pending",
        paystack_reference: reference,
        amount,
      });

      res.json({
        status: "success",
        data: {
          authorization_url: paystackRes.data.data.authorization_url,
          reference,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (paystackError) {
      console.error("Paystack error:", paystackError);
      res.status(500).json({
        status: "error",
        message: "Failed to initialize payment",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[payments/initiate] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/payments/verify - Verify payment
app.post("/api/payments/verify", async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      res.status(400).json({
        status: "error",
        message: "Missing reference",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const paystackRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (
        paystackRes.data.status &&
        paystackRes.data.data.status === "success"
      ) {
        const metadata = paystackRes.data.data.metadata;
        const { user_id, plan } = metadata;

        const durationDays =
          plan === "monthly" ? 30 : plan === "bundle" ? 90 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Update subscription
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: expiresAt.toISOString(),
          })
          .eq("paystack_reference", reference);

        // Update profile
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", user_id);

        res.json({
          status: "success",
          data: { success: true },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          status: "error",
          message: "Payment verification failed",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (paystackError) {
      console.error("Paystack verification error:", paystackError);
      res.status(500).json({
        status: "error",
        message: "Failed to verify payment",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[payments/verify] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/payments/webhook - Paystack webhook
app.post("/api/payments/webhook", async (req: Request, res: Response) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { event, data } = req.body;

    if (event === "charge.success") {
      const { reference, metadata } = data;
      const { user_id, plan } = metadata;

      const durationDays =
        plan === "monthly" || plan === "bundle" ? 30 : 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: expiresAt.toISOString(),
        })
        .eq("paystack_reference", reference);

      await supabaseAdmin
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
        })
        .eq("id", user_id);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[payments/webhook] Error:", error);
    res.status(200).json({ success: true });
  }
});

// GET /api/payments/status - Get current subscription status
app.get("/api/payments/status", async (req: Request, res: Response) => {
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

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const isActive =
      subscription?.status === "active" &&
      new Date(subscription.expires_at) > new Date();

    res.json({
      status: "success",
      data: {
        subscription_status: isActive ? "active" : "inactive",
        plan: subscription?.plan || null,
        expires_at: subscription?.expires_at || null,
        is_active: isActive,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[payments/status] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// ============ ADMIN ENDPOINTS ============

// Helper: Check admin role
const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      res.status(403).json({
        status: "error",
        message: "Admin access required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
};

// GET /api/admin/stats - Admin stats
app.get("/api/admin/stats", requireAdmin, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersRes, sessionsRes, questionsRes, subscriptionsRes] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id"),
        supabaseAdmin
          .from("sessions")
          .select("id")
          .gte("started_at", today.toISOString()),
        supabaseAdmin.from("questions").select("id"),
        supabaseAdmin
          .from("subscriptions")
          .select("amount")
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString()),
      ]);

    const newUsersRes = await supabaseAdmin
      .from("profiles")
      .select("id")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

    const totalRevenue =
      (subscriptionsRes.data?.reduce((sum, s: any) => sum + (s.amount || 0), 0) ||
        0) / 100;

    res.json({
      status: "success",
      data: {
        total_users: usersRes.data?.length || 0,
        sessions_today: sessionsRes.data?.length || 0,
        total_revenue: Math.round(totalRevenue),
        total_questions: questionsRes.data?.length || 0,
        new_users_this_week: newUsersRes.data?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/stats] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/admin/users - Paginated users
app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1");
    const limit = Math.min(parseInt((req.query.limit as string) || "20"), 100);
    const search = (req.query.search as string) || "";

    // Fetch all profiles (service role bypasses RLS)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, subscription_status, created_at, target_university_id");

    if (profilesError) {
      throw profilesError;
    }

    // Fetch all auth users to get emails
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    // Create email map from auth users
    const emailMap = new Map(
      authUsers.users.map((u: any) => [u.id, u.email])
    );

    // Merge profiles with emails
    const merged = (profiles || []).map((profile: any) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: emailMap.get(profile.id) || "N/A",
      role: profile.role || "user",
      subscription_status: profile.subscription_status,
      target_university_id: profile.target_university_id,
      created_at: profile.created_at,
    }));

    // Apply search filter
    let filtered = merged;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = merged.filter(
        (u: any) =>
          u.full_name?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    filtered.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = filtered.slice(start, end);

    res.json({
      status: "success",
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: filtered.length,
        total_pages: Math.ceil(filtered.length / limit),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/users] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// PATCH /api/admin/users/:id - Update user
app.patch(
  "/api/admin/users/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, subscription_status } = req.body;

      const updateData: any = {};
      if (role) updateData.role = role;
      if (subscription_status) updateData.subscription_status = subscription_status;

      const { data } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/users/:id] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// GET /api/admin/questions - Paginated questions
app.get(
  "/api/admin/questions",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = Math.min(
        parseInt((req.query.limit as string) || "20"),
        100
      );
      const subjectId = (req.query.subjectId as string) || "";
      const universityId = (req.query.universityId as string) || "";

      let query = supabaseAdmin
        .from("questions")
        .select("*, subjects(name), universities(name)", { count: "exact" });

      if (subjectId) query = query.eq("subject_id", subjectId);
      if (universityId) query = query.eq("university_id", universityId);

      const { data, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      res.json({
        status: "success",
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// POST /api/admin/questions - Create question
app.post(
  "/api/admin/questions",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { subject_id, university_id, year, body, explanation, options } =
        req.body;

      if (!subject_id || !university_id || !year || !body || !options) {
        res.status(400).json({
          status: "error",
          message: "Missing required fields",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const correctCount = options.filter((o: any) => o.is_correct).length;
      if (correctCount !== 1) {
        res.status(400).json({
          status: "error",
          message: "Exactly one option must be marked as correct",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const questionId = crypto.randomUUID();
      const { error: qError } = await supabaseAdmin
        .from("questions")
        .insert({
          id: questionId,
          subject_id,
          university_id,
          year,
          body,
          explanation,
        });

      if (qError) throw qError;

      const optionRows = options.map((o: any) => ({
        id: crypto.randomUUID(),
        question_id: questionId,
        label: o.label,
        body: o.body,
        is_correct: o.is_correct,
      }));

      const { error: oError } = await supabaseAdmin
        .from("options")
        .insert(optionRows);

      if (oError) throw oError;

      res.status(201).json({
        status: "success",
        data: { id: questionId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions POST] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// PATCH /api/admin/questions/:id - Update question
app.patch(
  "/api/admin/questions/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { body, explanation, year } = req.body;

      const updateData: any = {};
      if (body) updateData.body = body;
      if (explanation !== undefined) updateData.explanation = explanation;
      if (year) updateData.year = year;

      const { data } = await supabaseAdmin
        .from("questions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      res.json({
        status: "success",
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/:id PATCH] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// DELETE /api/admin/questions/:id - Delete question
app.delete(
  "/api/admin/questions/:id",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await supabaseAdmin.from("options").delete().eq("question_id", id);
      await supabaseAdmin.from("questions").delete().eq("id", id);

      res.json({
        status: "success",
        message: "Question deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[admin/questions/:id DELETE] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ============ UPLOAD ENDPOINTS ============

// Multer setup for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Cache for parsed questions (with TTL)
const uploadCache = new Map<string, { parsed: any; expiresAt: number }>();

// Helper function for admin auth check
const checkAdminAuth = async (req: Request, res: Response): Promise<string | null> => {
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
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    res.status(403).json({
      status: "error",
      message: "Admin access required",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  return user.id;
};

// POST /api/admin/upload/docx - Parse Word document
app.post("/api/admin/upload/docx", upload.single("file"), async (req: Request, res: Response) => {
  const userId = await checkAdminAuth(req, res);
  if (!userId) return;
  try {
    if (!req.file) {
      res.status(400).json({
        status: "error",
        message: "No file provided",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { subject_id, university_id, year } = req.body;
    if (!subject_id || !university_id || !year) {
      res.status(400).json({
        status: "error",
        message: "Missing subject_id, university_id, or year",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Extract text from .docx file
    const result = await mammoth.extractRawText({ buffer: req.file.buffer });
    const text = result.value;

    // Parse questions
    const parseResult = parseRomanSeriesDocument(text);

    // Generate upload token
    const uploadToken = crypto.randomUUID();
    const ttl = 10 * 60 * 1000; // 10 minutes
    uploadCache.set(uploadToken, {
      parsed: {
        questions: parseResult.questions,
        subject_id,
        university_id,
        year,
      },
      expiresAt: Date.now() + ttl,
    });

    // Return preview and all questions for expandable section
    res.json({
      status: "success",
      data: {
        preview: parseResult.questions.slice(0, 5),
        all_questions: parseResult.questions,
        topics: parseResult.topics,
        total_parsed: parseResult.total_parsed,
        total_matched: parseResult.total_matched,
        total_unmatched: parseResult.total_unmatched,
        errors: parseResult.errors,
        upload_token: uploadToken,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/upload/docx] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to parse document",
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/admin/upload/confirm - Confirm and save parsed questions
app.post("/api/admin/upload/confirm", async (req: Request, res: Response) => {
  const userId = await checkAdminAuth(req, res);
  if (!userId) return;

  try {
    const { upload_token, subject_id, university_id, year } = req.body;

    if (!upload_token) {
      res.status(400).json({
        status: "error",
        message: "Missing upload_token",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check cache
    const cached = uploadCache.get(upload_token);
    if (!cached || cached.expiresAt < Date.now()) {
      res.status(400).json({
        status: "error",
        message: "Upload token expired or invalid",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { questions, topics } = cached.parsed;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const affectedTopicIds: string[] = [];

    try {
      // Step 1: Create or get topics
      const topicMap = new Map<string, string>();

      for (const topicName of topics) {
        try {
          // Check if topic exists
          const { data: existing } = await supabaseAdmin
            .from("topics")
            .select("id")
            .eq("subject_id", subject_id)
            .eq("university_id", university_id)
            .eq("name", topicName)
            .single();

          if (existing) {
            topicMap.set(topicName, existing.id);
            affectedTopicIds.push(existing.id);
          } else {
            // Create new topic
            const topicId = crypto.randomUUID();
            const { error: tError } = await supabaseAdmin
              .from("topics")
              .insert({
                id: topicId,
                name: topicName,
                subject_id,
                university_id,
                question_count: 0,
              });

            if (tError) throw tError;
            topicMap.set(topicName, topicId);
            affectedTopicIds.push(topicId);
          }
        } catch (error) {
          errors.push(`Failed to create topic "${topicName}": ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      // Step 2: Insert questions in batches of 20
      for (let i = 0; i < questions.length; i += 20) {
        const batch = questions.slice(i, i + 20);

        for (const question of batch) {
          try {
            // Skip if no option has is_correct = true
            const hasCorrectAnswer = question.options.some((o: any) => o.is_correct);
            if (!hasCorrectAnswer) {
              skipped++;
              continue;
            }

            const topicId = topicMap.get(question.topic_name);

            // Insert question
            const { data: questionData, error: qError } = await supabaseAdmin
              .from("questions")
              .insert({
                subject_id,
                university_id,
                year,
                body: question.body,
                explanation: question.explanation,
                topic_id: topicId || null,
                topic_name: question.topic_name,
              })
              .select()
              .single();

            if (qError) throw qError;

            // Insert options
            const optionRows = question.options.map((o: any) => ({
              id: crypto.randomUUID(),
              question_id: questionData.id,
              label: o.label,
              body: o.body,
              is_correct: o.is_correct,
            }));

            const { error: oError } = await supabaseAdmin.from("options").insert(optionRows);

            if (oError) throw oError;

            created++;
          } catch (error) {
            skipped++;
            errors.push(`Failed to save question: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }
      }

      // Step 3: Update topic question counts
      for (const topicId of affectedTopicIds) {
        try {
          const { data: count } = await supabaseAdmin
            .from("questions")
            .select("id", { count: "exact" })
            .eq("topic_id", topicId);

          await supabaseAdmin
            .from("topics")
            .update({ question_count: count || 0 })
            .eq("id", topicId);
        } catch (error) {
          errors.push(`Failed to update topic count: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      errors.push(`Upload process failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Clear cache
    uploadCache.delete(upload_token);

    res.json({
      status: "success",
      data: {
        created,
        skipped,
        errors,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/upload/confirm] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/admin/upload/manual - Add single question manually
app.post("/api/admin/upload/manual", async (req: Request, res: Response) => {
  const userId = await checkAdminAuth(req, res);
  if (!userId) return;

  try {
    const { subject_id, university_id, year, body, explanation, options } = req.body;

    if (!subject_id || !university_id || !year || !body || !options) {
      res.status(400).json({
        status: "error",
        message: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const correctCount = options.filter((o: any) => o.is_correct).length;
    if (correctCount !== 1) {
      res.status(400).json({
        status: "error",
        message: "Exactly one option must be marked as correct",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Insert question
    const { data: questionData, error: qError } = await supabaseAdmin
      .from("questions")
      .insert({
        subject_id,
        university_id,
        year,
        body,
        explanation: explanation || null,
      })
      .select()
      .single();

    if (qError) throw qError;

    // Insert options
    const optionRows = options.map((o: any) => ({
      id: crypto.randomUUID(),
      question_id: questionData.id,
      label: o.label,
      body: o.body,
      is_correct: o.is_correct,
    }));

    const { error: oError } = await supabaseAdmin.from("options").insert(optionRows);

    if (oError) throw oError;

    res.status(201).json({
      status: "success",
      data: {
        id: questionData.id,
        ...questionData,
        options: optionRows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/upload/manual] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Not found",
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use(
  (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error("[error]:", err);
    res.status(err.status || 500).json({
      status: "error",
      message: err.message || "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
