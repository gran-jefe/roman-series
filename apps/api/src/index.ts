// MUST be the FIRST import - load environment variables before anything else
import dotenv from "dotenv";
dotenv.config();

// All other imports AFTER dotenv.config()
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerDataRoutes } from "./routes/data.routes";
import { registerSessionsRoutes } from "./routes/sessions.routes";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerUploadRoutes } from "./routes/admin.upload.routes";
import { registerPaymentsRoutes } from "./routes/payments.routes";
import { registerLeaderboardRoutes } from "./routes/leaderboard.routes";
import { registerAnalyticsRoutes } from "./routes/analytics.routes";
import { registerFlaggingRoutes } from "./routes/flagging.routes";
import { registerPlansRoutes } from "./routes/plans";
import { registerRecalledQuestionsRoutes } from "./routes/recalled-questions.routes";
import { registerFeedbackRoutes } from "./routes/feedback.routes";

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Supabase clients configured to disable Realtime (not needed on backend)
// This avoids Node.js < 22 WebSocket compatibility issues
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: fetch,
  },
});

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetch,
  },
});

// Zod schemas for validation
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1, "Full name is required").max(100),
  target_university_id: z.string().uuid("Invalid university ID").optional(),
  target_course: z.string().min(1, "Course of study is required").max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const app: Express = express();
// Render sits behind a reverse proxy; trust its single hop so req.ip reflects
// the real client IP (X-Forwarded-For) instead of the proxy's IP for everyone.
app.set('trust proxy', 1);
const port = process.env.PORT || 4000;
// Use WEB_URL for backend, fallback to NEXT_PUBLIC_WEB_URL for backwards compatibility
const webUrl = process.env.WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)
  .concat(['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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

// Multer setup for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Cache for parsed questions (with TTL)
const uploadCache = new Map<string, { parsed: any; expiresAt: number }>();

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

// Register all routes with dependency injection
registerAuthRoutes(app, {
  supabaseAdmin,
  supabaseClient,
  authLimiter,
  webUrl,
  registerSchema,
  loginSchema,
});

registerDataRoutes(app, { supabaseAdmin });

registerSessionsRoutes(app, { supabaseAdmin });

registerAdminRoutes(app, {
  supabaseAdmin,
  upload,
  uploadCache,
});

registerUploadRoutes(app, { supabaseAdmin });

registerPaymentsRoutes(app, {
  supabaseAdmin,
  webUrl,
  flwWebhookHash: process.env.FLW_WEBHOOK_HASH,
});

registerLeaderboardRoutes(app, { supabaseAdmin });

registerAnalyticsRoutes(app, {
  supabaseAdmin,
  groqApiKey: process.env.GROQ_API_KEY || "",
});

registerFlaggingRoutes(app, { supabaseAdmin });

registerPlansRoutes(app, { supabaseAdmin });

registerRecalledQuestionsRoutes(app, { supabaseAdmin });

registerFeedbackRoutes(app, { supabaseAdmin });

// Legacy inline routes removed - all routes now organized in route files
// Auth routes (migrated to routes/auth.routes.ts)
// Data routes (migrated to routes/data.routes.ts)
// Sessions routes (migrated to routes/sessions.routes.ts)
// Admin routes (migrated to routes/admin.routes.ts)
// Payments routes (migrated to routes/payments.routes.ts)
// Leaderboard routes (migrated to routes/leaderboard.routes.ts)

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
