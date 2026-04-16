import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabase.ts";
import type { University } from "types";

const router = Router();

/**
 * GET /api/universities
 * Fetch all universities
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
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
      data: data as University[],
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

export default router;
