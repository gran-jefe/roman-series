import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";

interface AuthDeps {
  supabaseAdmin: SupabaseClient;
  supabaseClient: SupabaseClient;
  authLimiter: RateLimitRequestHandler;
  webUrl: string;
  registerSchema: z.ZodObject<any>;
  loginSchema: z.ZodObject<any>;
}

export function registerAuthRoutes(app: Express, deps: AuthDeps) {
  const { supabaseAdmin, supabaseClient, authLimiter, webUrl, registerSchema, loginSchema } = deps;

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

      const { full_name, email, password, target_university_id, target_course } = validation.data;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        full_name,
        target_university_id,
        target_course,
        role: "student",
        subscription_status: "explorer",
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

      // Store session creation time for 24-hour inactivity timeout
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 24);

      await supabaseAdmin
        .from("profiles")
        .update({
          last_login: new Date().toISOString(),
          session_expires_at: sessionExpiresAt.toISOString(),
        })
        .eq("id", data.user.id);

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
          expires_in: 86400, // 24 hours in seconds
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
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
        console.error("[auth/refresh] Supabase refresh error:", error?.message || "Unknown error");
        res.status(401).json({
          status: "error",
          message: error?.message || "Failed to refresh session. Please log in again.",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Extend session expiration by 24 hours (activity-based timeout)
      if (data.user) {
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setHours(sessionExpiresAt.getHours() + 24);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            session_expires_at: sessionExpiresAt.toISOString(),
          })
          .eq("id", data.user.id);

        if (updateError) {
          console.error("[auth/refresh] Failed to update session expiry:", updateError);
        }
      }

      res.json({
        status: "success",
        data: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: 86400, // 24 hours in seconds
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[auth/refresh] Unexpected error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error during token refresh",
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

  app.patch("/api/profiles/subject-combination", async (req: Request, res: Response) => {
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
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { subject_combination } = req.body;

      if (!subject_combination || !Array.isArray(subject_combination)) {
        res.status(400).json({
          status: "error",
          message: "subject_combination must be an array",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (subject_combination.length < 3 || subject_combination.length > 4) {
        res.status(400).json({
          status: "error",
          message: "You must select 3 or 4 subjects",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate all are UUIDs and exist in subjects table (or are "other")
      const realSubjectIds = subject_combination.filter((id: string) => id !== "other");

      if (realSubjectIds.length === 0) {
        res.status(400).json({
          status: "error",
          message: "You must select at least one actual subject",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: subjects, error: subjectsError } = await supabaseAdmin
        .from("subjects")
        .select("id")
        .in("id", realSubjectIds);

      if (subjectsError || !subjects || subjects.length < 3) {
        res.status(400).json({
          status: "error",
          message: "Invalid subjects selected",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Update profile with real subjects only (filter out "other")
      const { data: profile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ subject_combination: realSubjectIds })
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError || !profile) {
        res.status(500).json({
          status: "error",
          message: "Failed to update subject combination",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: { profile },
        message: "Subject combination updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[profiles/subject-combination] Error:", error);
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

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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

  app.patch("/api/profiles/utme-score", async (req: Request, res: Response) => {
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
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { utme_score } = req.body;

      if (utme_score === undefined) {
        res.status(400).json({
          status: "error",
          message: "Missing required field: utme_score",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (typeof utme_score !== "number" || utme_score < 0 || utme_score > 400) {
        res.status(400).json({
          status: "error",
          message: "UTME score must be a number between 0 and 400",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: profile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ utme_score })
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError || !profile) {
        res.status(500).json({
          status: "error",
          message: "Failed to update UTME score",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: { profile },
        message: "UTME score updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[profiles/utme-score] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.patch("/api/profiles/me", async (req: Request, res: Response) => {
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
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { full_name, target_course, utme_score } = req.body;

      const updateData: any = {};

      if (full_name !== undefined) {
        if (typeof full_name !== "string" || full_name.trim().length === 0) {
          res.status(400).json({
            status: "error",
            message: "Full name must be a non-empty string",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.full_name = full_name;
      }

      if (target_course !== undefined) {
        if (typeof target_course !== "string" || target_course.trim().length === 0) {
          res.status(400).json({
            status: "error",
            message: "Target course must be a non-empty string",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.target_course = target_course;
      }

      if (utme_score !== undefined) {
        if (typeof utme_score !== "number" || utme_score < 0 || utme_score > 400) {
          res.status(400).json({
            status: "error",
            message: "UTME score must be a number between 0 and 400",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.utme_score = utme_score;
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          status: "error",
          message: "No fields to update",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { data: profile, error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError || !profile) {
        res.status(500).json({
          status: "error",
          message: "Failed to update profile",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        status: "success",
        data: { profile },
        message: "Profile updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[profiles/me] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
