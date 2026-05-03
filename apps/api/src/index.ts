import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
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
  target_university_id: z.string().uuid("Invalid university ID"),
  target_course: z.string().min(1, "Course of study is required").max(100),
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
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  webUrl,
});

registerLeaderboardRoutes(app, { supabaseAdmin });

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
