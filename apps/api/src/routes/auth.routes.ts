import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import { firebaseAdminAuth } from "../lib/firebaseAdmin";
import { migrateLegacyUserToFirebase } from "../lib/authMigration";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

interface AuthDeps {
  supabaseAdmin: SupabaseClient;
  authLimiter: RateLimitRequestHandler;
  registerSchema: z.ZodObject<any>;
}

export function registerAuthRoutes(app: Express, deps: AuthDeps) {
  const { supabaseAdmin, authLimiter, registerSchema } = deps;

  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
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

      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          status: "error",
          message: validation.error.errors[0].message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { full_name, target_university_id, target_course } = validation.data;

      const token = authHeader.substring(7);
      let decoded;
      try {
        decoded = await firebaseAdminAuth.verifyIdToken(token);
      } catch {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!decoded.email) {
        res.status(400).json({
          status: "error",
          message: "Firebase account has no associated email",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // A placeholder Supabase Auth user is still required: profiles.id has a
      // hard FK to auth.users(id). Nobody ever logs into this account directly.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: decoded.email,
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
        firebase_uid: decoded.uid,
        email: decoded.email,
        full_name,
        target_university_id,
        target_course,
        role: "student",
        subscription_status: "explorer",
      });

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        await firebaseAdminAuth.deleteUser(decoded.uid).catch(() => {});

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
            email: decoded.email,
          },
        },
        message: "User created successfully.",
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

      // No password check here by design: this endpoint mirrors the previous
      // Supabase resetPasswordForEmail behavior, where proving inbox ownership
      // via the emailed link is the actual verification step.
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, firebase_uid")
        .eq("email", email)
        .is("firebase_uid", null)
        .single();

      if (profileError || !profile) {
        // Either no such account, or already migrated (frontend will attempt
        // Firebase's own sendPasswordResetEmail directly in that case).
        res.json({ success: false, migrated: false });
        return;
      }

      const result = await migrateLegacyUserToFirebase({
        profileId: profile.id,
        email,
        supabaseAdmin,
      });

      if (!result.success) {
        res.status(500).json({
          status: "error",
          message: "Failed to migrate account",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({ success: true, migrated: true });
    } catch (error) {
      console.error("[auth/forgot-password] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.patch(
    "/api/profiles/subject-combination",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
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

        const { data: profile, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ subject_combination: realSubjectIds })
          .eq("id", req.userId)
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
    }
  );

  app.get("/api/auth/me", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", req.userId)
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
            id: profile.id,
            email: profile.email,
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

  app.patch(
    "/api/profiles/utme-score",
    requireAuth(supabaseAdmin),
    async (req: AuthedRequest, res: Response) => {
      try {
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
          .eq("id", req.userId)
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
    }
  );

  app.patch("/api/profiles/me", requireAuth(supabaseAdmin), async (req: AuthedRequest, res: Response) => {
    try {
      const { full_name, target_university_id, target_course, utme_score } = req.body;

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

      if (target_university_id !== undefined) {
        if (typeof target_university_id !== "string" || target_university_id.trim().length === 0) {
          res.status(400).json({
            status: "error",
            message: "Target university ID must be a non-empty string",
            timestamp: new Date().toISOString(),
          });
          return;
        }
        updateData.target_university_id = target_university_id;
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
        .eq("id", req.userId)
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
