import { Request, Response, NextFunction } from "express";
import { requireAuth } from "./auth.middleware.ts";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First apply the requireAuth middleware
    await requireAuth(req, res, () => {
      // Check if user is admin
      if (req.profile?.role !== "admin") {
        res.status(403).json({
          status: "error",
          message: "Admin access required",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    });
  } catch (error) {
    console.error("[requireAdmin.middleware] Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
}

export default requireAdmin;
