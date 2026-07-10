import { Request, Response, NextFunction } from "express";
import { SupabaseClient } from "@supabase/supabase-js";
import { firebaseAdminAuth } from "../lib/firebaseAdmin";

export interface AuthedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export interface ResolvedUser {
  userId: string;
  userRole: string;
}

export class ProfileLookupError extends Error {}

export async function resolveUserFromToken(
  token: string,
  supabaseAdmin: SupabaseClient
): Promise<ResolvedUser | null> {
  // Let this throw on an invalid/expired token - callers must return 401 for it.
  const decoded = await firebaseAdminAuth.verifyIdToken(token);

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("firebase_uid", decoded.uid)
    .single();

  if (error) {
    // DB/infra failure, not a bad token - the caller must not treat this as a 401.
    throw new ProfileLookupError(error.message);
  }

  if (!profile) {
    return null;
  }

  return { userId: profile.id, userRole: profile.role };
}

export function requireAuth(supabaseAdmin: SupabaseClient) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
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
      const resolved = await resolveUserFromToken(token, supabaseAdmin);

      if (!resolved) {
        res.status(401).json({
          status: "error",
          message: "Invalid or expired token",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      req.userId = resolved.userId;
      req.userRole = resolved.userRole;
      next();
    } catch (error) {
      if (error instanceof ProfileLookupError) {
        res.status(503).json({
          status: "error",
          message: "Unable to verify account right now, please try again",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
        timestamp: new Date().toISOString(),
      });
    }
  };
}
