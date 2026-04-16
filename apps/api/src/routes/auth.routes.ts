import { Router, Request, Response } from "express";
import { supabaseAdmin, supabaseClient } from "../lib/supabase.ts";
import { requireAuth } from "../middleware/auth.middleware.ts";
import type { Profile } from "types";

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, password, target_university_id } = req.body;

    // Validation
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

    if (authError || !authData.user) {
      res.status(400).json({
        status: "error",
        message: authError?.message || "Failed to create user",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create user profile
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
      // Clean up - delete the user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      res.status(400).json({
        status: "error",
        message: "Failed to create user profile",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Send verification email
    await supabaseAdmin.auth.resendEnvelope({
      type: "signup",
      email,
    });

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

/**
 * POST /api/auth/login
 * Authenticate a user with email and password
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
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

    // Sign in with Supabase
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

    // Fetch user profile
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
        profile: profile as Profile,
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

/**
 * POST /api/auth/logout
 * Logout the current user
 */
router.post(
  "/logout",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      await supabaseAdmin.auth.admin.signOut(req.user.id);

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
  }
);

/**
 * POST /api/auth/refresh
 * Refresh an expired access token
 */
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
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

/**
 * POST /api/auth/forgot-password
 * Send a password reset email
 */
router.post(
  "/forgot-password",
  async (req: Request, res: Response): Promise<void> => {
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
        redirectTo: `${process.env.NEXT_PUBLIC_WEB_URL}/reset-password`,
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
  }
);

/**
 * GET /api/auth/me
 * Get the current authenticated user's profile
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.profile) {
        res.status(401).json({
          status: "error",
          message: "User not authenticated",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Fetch profile with target university if available
      let profileData: any = req.profile;

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
            id: req.user?.id,
            email: req.user?.email,
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
  }
);

export default router;
