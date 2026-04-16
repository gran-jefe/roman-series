import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// import authRoutes from "./routes/auth.routes.ts";
// import universitiesRoutes from "./routes/universities.routes.ts";

dotenv.config();

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const app: Express = express();
const port = process.env.PORT || 4000;
const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: webUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, target_university_id } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({
        status: "error",
        message: "Missing required fields: email, password, full_name",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters",
        timestamp: new Date().toISOString(),
      });
      return;
    }

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

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: "error",
        message: "Missing required fields: email, password",
        timestamp: new Date().toISOString(),
      });
      return;
    }

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

app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
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

    res.json({
      status: "success",
      data: data,
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
      total_questions,
      year,
    } = req.body;

    if (!subject_id || !university_id || !total_questions) {
      res.status(400).json({
        status: "error",
        message: "Missing required fields: subject_id, university_id, total_questions",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Free user cap
    if (profile.subscription_status === "free") {
      total_questions = Math.min(total_questions, 10);
    }
    total_questions = Math.min(total_questions, 50);

    // Fetch all matching question IDs
    let idQuery = supabaseAdmin
      .from("questions")
      .select("id")
      .eq("subject_id", subject_id)
      .eq("university_id", university_id);

    if (year) {
      idQuery = idQuery.eq("year", year);
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
    const selectedIds = shuffled.slice(0, total_questions).map((q: any) => q.id);

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

    // Strip is_correct from options
    const sanitizedQuestions = questions.map((q: any) => ({
      ...q,
      explanation: undefined,
      options: q.options.map(({ is_correct, ...opt }: any) => opt),
    }));

    // Fetch subject and university
    const [{ data: subject }, { data: university }] = await Promise.all([
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
    ]);

    res.status(201).json({
      status: "success",
      data: {
        session_id: session.id,
        questions: sanitizedQuestions,
        subject,
        university,
        total_questions: questions.length,
      },
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

    // Enrich with subject and university names
    const enriched = await Promise.all(
      (sessions ?? []).map(async (session: any) => {
        const [subjectRes, uniRes] = await Promise.all([
          session.subject_id
            ? supabaseAdmin
                .from("subjects")
                .select("name")
                .eq("id", session.subject_id)
                .single()
            : Promise.resolve({ data: null }),
          session.university_id
            ? supabaseAdmin
                .from("universities")
                .select("name")
                .eq("id", session.university_id)
                .single()
            : Promise.resolve({ data: null }),
        ]);

        return {
          ...session,
          subject_name: subjectRes.data?.name ?? null,
          university_name: uniRes.data?.name ?? null,
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
