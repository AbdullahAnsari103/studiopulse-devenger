/**
 * Activity Tracking API Routes — Logs and retrieves user activity for the AI Brain.
 * Every user action on StudioPulse is tracked here so Studio AI has full awareness.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";

const router = Router();

/**
 * POST /api/activity/log
 * Log a user activity. Called from the frontend on every significant action.
 */
router.post("/log", async (req: Request, res: Response) => {
  try {
    const { userId, action, details, page } = req.body;

    if (!userId || !action) {
      res.status(400).json({ error: "userId and action are required" });
      return;
    }

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO user_activity_log (id, user_id, action, details, page, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [id, userId, action, details || null, page || null],
    });

    res.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to log activity";
    console.error("[Activity] Log error:", msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/activity/recent
 * Fetch recent user activities for AI context injection.
 */
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const result = await db.execute({
      sql: `SELECT action, details, page, created_at 
            FROM user_activity_log 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
      args: [userId, limit],
    });

    res.json({ activities: result.rows });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch activities";
    console.error("[Activity] Fetch error:", msg);
    res.status(500).json({ error: msg });
  }
});

// ─── Server-Side Activity Logger (called from other routes) ───

/**
 * Log an activity from the server side (non-HTTP).
 * Used by upload, publish, delete, and optimize routes.
 */
export async function logServerActivity(
  userId: string,
  action: string,
  details?: string,
  page?: string
): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO user_activity_log (id, user_id, action, details, page, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [id, userId, action, details || null, page || null],
    });
  } catch (err) {
    console.error("[Activity] Server-side log failed:", err);
  }
}

export default router;
