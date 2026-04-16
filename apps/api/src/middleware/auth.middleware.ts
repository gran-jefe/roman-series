import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.ts";
import type { User, Profile } from "types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      profile?: Profile;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

    // Verify the token with Supabase
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

    // Fetch the user's profile
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

    // Attach user and profile to request
    req.user = user as unknown as User;
    req.profile = profile as unknown as Profile;

    next();
  } catch (error) {
    console.error("[auth.middleware] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
}

export default requireAuth;
