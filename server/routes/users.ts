import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";

const router = Router();

/**
 * POST /api/users/sync
 * Sync a Clerk user to Turso database.
 * Called after successful authentication.
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { clerkId, email, firstName, lastName, imageUrl } = req.body;

    if (!clerkId || !email) {
      res.status(400).json({ error: "clerkId and email are required" });
      return;
    }

    // Upsert user — insert or update if exists
    await db.execute({
      sql: `
        INSERT INTO users (id, clerk_id, email, first_name, last_name, image_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(clerk_id) DO UPDATE SET
          email = excluded.email,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          image_url = excluded.image_url,
          updated_at = datetime('now')
      `,
      args: [
        crypto.randomUUID(),
        clerkId,
        email,
        firstName || null,
        lastName || null,
        imageUrl || null,
      ],
    });

    res.status(200).json({ message: "User synced successfully" });
  } catch (error) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

/**
 * GET /api/users/:clerkId
 * Fetch a user by their Clerk ID.
 */
router.get("/:clerkId", async (req: Request, res: Response) => {
  try {
    const { clerkId } = req.params;

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE clerk_id = ?",
      args: [clerkId],
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
