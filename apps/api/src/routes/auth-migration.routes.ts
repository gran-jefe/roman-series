import { Express, Request, Response } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import { migrateLegacyUserToFirebase } from "../lib/authMigration";

interface AuthMigrationDeps {
  supabaseAdmin: SupabaseClient;
  supabaseClient: SupabaseClient;
  authLimiter: RateLimitRequestHandler;
}

const migrateSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export function registerAuthMigrationRoutes(app: Express, deps: AuthMigrationDeps) {
  const { supabaseAdmin, supabaseClient, authLimiter } = deps;

  app.post("/api/auth/migrate-user", authLimiter, async (req: Request, res: Response) => {
    try {
      const validation = migrateSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          status: "error",
          message: validation.error.errors[0].message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { email, password } = validation.data;

      // The legacy Supabase password is still the only proof of ownership we
      // have for pre-migration accounts, so verify it before touching anything.
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        res.json({ success: false, migrated: false });
        return;
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, firebase_uid")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile || profile.firebase_uid) {
        // No profile, or already migrated (this was just a mistyped Firebase password).
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
      console.error("[auth/migrate-user] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
