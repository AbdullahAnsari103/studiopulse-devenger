import crypto from "crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import { getYouTubeAuthUrl, handleYouTubeCallback, disconnectYouTube } from "../integrations/youtube/auth";
import { fetchYouTubeAnalytics } from "../integrations/youtube/analytics";
import { syncYouTubeData } from "../integrations/youtube/sync";
import { fetchDetailedAnalytics } from "../integrations/youtube/detailed-analytics";
import { metaService } from "../integrations/meta/service";
import { verifySignedState } from "../utils/oauth-state";
import { db } from "../db";

const router = Router();

// ─── YOUTUBE ────────────────────────────────────────────────────────────────

/**
 * POST /api/platforms/youtube/connect
 * Returns the Google OAuth URL to redirect the user to.
 */
router.post("/youtube/connect", (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const authUrl = getYouTubeAuthUrl(userId);
    res.json({ authUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate auth URL";
    console.error("YouTube connect error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/platforms/youtube/callback
 * Google OAuth callback — exchanges code for tokens and stores the connection.
 * Redirects back to the frontend Content Studio page.
 */
router.get("/youtube/callback", async (req: Request, res: Response) => {
  try {
    const { code, state: userId, error: oauthError } = req.query;

    if (oauthError) {
      // User denied access or something went wrong
      res.redirect(`http://localhost:5173/content-studio?error=${encodeURIComponent(oauthError as string)}`);
      return;
    }

    if (!code || !userId) {
      res.redirect("http://localhost:5173/content-studio?error=missing_params");
      return;
    }

    const result = await handleYouTubeCallback(code as string, userId as string);

    // Trigger an initial data sync after connecting
    try {
      await syncYouTubeData(userId as string);
      await fetchDetailedAnalytics(userId as string);
    } catch (err) {
      console.error("Initial detailed sync failed:", err);
    }

    res.redirect(`http://localhost:5173/content-studio?connected=youtube&channel=${encodeURIComponent(result.accountName)}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "OAuth callback failed";
    console.error("YouTube callback error:", message);
    res.redirect(`http://localhost:5173/content-studio?error=${encodeURIComponent(message)}`);
  }
});

/**
 * GET /api/platforms/youtube/analytics
 * Fetch real-time analytics from the YouTube API for the connected user.
 */
router.get("/youtube/analytics", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const analytics = await fetchYouTubeAnalytics(userId);
    res.json(analytics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    console.error("YouTube analytics error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── GENERIC PLATFORM ROUTES ────────────────────────────────────────────────

/**
 * GET /api/platforms/status
 * Returns all connected platform statuses for a user.
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const result = await db.execute({
      sql: `SELECT id, platform, account_id, account_name, account_email, profile_image, connected_at, last_sync, is_connected
            FROM connected_platforms
            WHERE user_id = ? AND is_connected = 1`,
      args: [userId],
    });

    // Build a map of platform → connection info (never expose tokens)
    const platforms: Record<string, unknown> = {};
    for (const row of result.rows) {
      platforms[row.platform as string] = {
        id: row.id,
        accountId: row.account_id,
        accountName: row.account_name,
        accountEmail: row.account_email,
        profileImage: row.profile_image,
        connectedAt: row.connected_at,
        lastSync: row.last_sync,
        isConnected: row.is_connected === 1,
      };
    }

    res.json({ platforms });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch platform status";
    console.error("Platform status error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/platforms/disconnect
 * Disconnect a platform for a user.
 */
router.post("/disconnect", async (req: Request, res: Response) => {
  try {
    const { userId, platform } = req.body;
    if (!userId || !platform) {
      res.status(400).json({ error: "userId and platform are required" });
      return;
    }

    if (platform === "youtube") {
      await disconnectYouTube(userId);
    } else if (platform === "facebook" || platform === "instagram" || platform === "meta") {
      await db.execute({
        sql: "UPDATE connected_platforms SET is_connected = 0, access_token = '', refresh_token = '' WHERE user_id = ? AND platform IN ('facebook', 'instagram', 'meta')",
        args: [userId],
      });
    } else {
      // For other platforms, just mark as disconnected
      await db.execute({
        sql: "UPDATE connected_platforms SET is_connected = 0 WHERE user_id = ? AND platform = ?",
        args: [userId, platform],
      });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Disconnect failed";
    console.error("Disconnect error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/platforms/direct-connect
 * Direct connection fallback for Instagram / Facebook / TikTok accounts.
 */
router.post("/direct-connect", async (req: Request, res: Response) => {
  try {
    const { userId, platform, accountName } = req.body;
    if (!userId || !platform) {
      res.status(400).json({ error: "userId and platform are required" });
      return;
    }

    const cleanInput = (accountName || "").trim().replace(/^@/, "");
    const instaHandle = cleanInput ? `@${cleanInput}` : "@official_creator";
    const fbHandle = cleanInput ? `${cleanInput} Official Page` : "Facebook Creator Page";
    const accId = `acc_${Date.now().toString(36)}`;

    const targetPlatforms = (platform === "instagram" || platform === "facebook" || platform === "meta")
      ? ["instagram", "facebook"]
      : [platform];

    for (const p of targetPlatforms) {
      const nameToStore = p === "instagram" ? instaHandle : p === "facebook" ? fbHandle : (cleanInput ? `@${cleanInput}` : `@${platform}_creator`);
      await db.execute({
        sql: `
          INSERT INTO connected_platforms (id, user_id, platform, account_id, account_name, profile_image, access_token, refresh_token, expires_at, connected_at, last_sync, is_connected)
          VALUES (?, ?, ?, ?, ?, '', 'direct_live_token', '', datetime('now', '+60 days'), datetime('now'), datetime('now'), 1)
          ON CONFLICT(user_id, platform) DO UPDATE SET
            account_id = excluded.account_id,
            account_name = excluded.account_name,
            connected_at = datetime('now'),
            last_sync = datetime('now'),
            is_connected = 1
        `,
        args: [crypto.randomUUID(), userId, p, accId, nameToStore],
      });
    }

    res.json({ success: true, message: `${platform} connected successfully` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Direct connect failed";
    console.error("Direct connect error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/platforms/mock-connect
 * Mock connects a platform (like Instagram or TikTok) in the database.
 */
router.post("/mock-connect", async (req: Request, res: Response) => {
  try {
    const { userId, platform, accountName } = req.body;
    if (!userId || !platform) {
      res.status(400).json({ error: "userId and platform are required" });
      return;
    }

    // SQLite / Turso insert or update connection
    await db.execute({
      sql: "DELETE FROM connected_platforms WHERE user_id = ? AND platform = ?",
      args: [userId, platform],
    });

    await db.execute({
      sql: `INSERT INTO connected_platforms (user_id, platform, account_name, account_id, is_connected, connected_at, last_sync)
            VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [userId, platform, accountName || `Mock ${platform} Creator`, `mock_${platform}_id`],
    });

    res.json({ success: true, message: `${platform} connected successfully (mock)` });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Mock connection failed";
    console.error("Mock connect error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/platforms/sync
 * Trigger a manual data sync for a platform.
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const { userId, platform } = req.body;
    if (!userId || !platform) {
      res.status(400).json({ error: "userId and platform are required" });
      return;
    }

    if (platform === "youtube") {
      const result = await syncYouTubeData(userId);
      try {
        await fetchDetailedAnalytics(userId);
      } catch (err) {
        console.error("Manual detailed sync failed:", err);
      }
      res.json(result);
    } else if (platform === "facebook" || platform === "instagram" || platform === "meta") {
      const result = await metaService.sync(userId, platform);
      res.json(result);
    } else {
      res.status(400).json({ error: `Sync not yet implemented for ${platform}` });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("Sync error:", message);

    if (
      message.includes("invalid_grant") ||
      message.includes("expired") ||
      message.includes("reconnect") ||
      message.includes("revoked") ||
      message.includes("Unauthorized")
    ) {
      if (req.body.userId) {
        await db.execute({
          sql: "UPDATE connected_platforms SET is_connected = 0 WHERE user_id = ? AND platform = ?",
          args: [req.body.userId, req.body.platform || "youtube"],
        });
      }
      res.status(401).json({ error: "YouTube session expired. Please reconnect your YouTube channel." });
      return;
    }

    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/platforms/youtube/debug
 * Debug endpoint: dumps what's in the database for a user's YouTube data.
 * NEVER expose tokens — only data tables.
 */
router.get("/youtube/debug", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Check connection
    const connectionResult = await db.execute({
      sql: "SELECT platform, account_id, account_name, is_connected, connected_at, last_sync FROM connected_platforms WHERE user_id = ? AND platform = 'youtube'",
      args: [userId],
    });

    // Get channel data
    const channelResult = await db.execute({
      sql: "SELECT channel_id, title, subscriber_count, view_count, video_count, updated_at FROM youtube_channels WHERE user_id = ?",
      args: [userId],
    });

    // Get video count and sample
    const videoCountResult = await db.execute({
      sql: "SELECT COUNT(*) as total FROM youtube_videos WHERE user_id = ?",
      args: [userId],
    });
    const videoSample = await db.execute({
      sql: "SELECT video_id, title, views, likes, comments, ctr, impressions, revenue, published_at, is_short FROM youtube_videos WHERE user_id = ? ORDER BY views DESC LIMIT 5",
      args: [userId],
    });

    // Get analytics count and sample
    const analyticsCountResult = await db.execute({
      sql: "SELECT COUNT(*) as total FROM youtube_analytics WHERE user_id = ?",
      args: [userId],
    });
    const analyticsSample = await db.execute({
      sql: "SELECT date, views, estimated_minutes_watched, subscribers_gained, estimated_revenue FROM youtube_analytics WHERE user_id = ? ORDER BY date DESC LIMIT 5",
      args: [userId],
    });

    res.json({
      userId,
      connection: connectionResult.rows[0] || null,
      channel: channelResult.rows[0] || null,
      videos: {
        total: videoCountResult.rows[0]?.total || 0,
        sample: videoSample.rows,
      },
      analytics: {
        total: analyticsCountResult.rows[0]?.total || 0,
        sample: analyticsSample.rows,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Debug query failed";
    console.error("Debug error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── META (Facebook + Instagram) ──────────────────────────────────────────────

/**
 * POST /api/platforms/meta/connect
 * Generates the Facebook Login OAuth URL with an HMAC-signed state parameter.
 */
router.post("/meta/connect", (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (!metaService.isConfigured()) {
      res.status(400).json({ error: "Meta API credentials not configured. Set META_APP_ID and META_APP_SECRET." });
      return;
    }

    const authUrl = metaService.getConnectUrl(userId);
    res.json({ authUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate Meta auth URL";
    console.error("Meta connect error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/platforms/meta/callback
 * Meta OAuth callback — verifies signed state, exchanges code for long-lived tokens,
 * discovers Facebook Pages & Instagram accounts, and stores primary connections.
 */
router.get("/meta/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.redirect(`http://localhost:5173/content-studio?error=${encodeURIComponent(oauthError as string)}`);
      return;
    }

    if (!code || !state) {
      res.redirect("http://localhost:5173/content-studio?error=missing_params");
      return;
    }

    // Verify HMAC-signed OAuth state parameter
    const payload = verifySignedState(state as string);
    if (!payload) {
      console.warn("[Meta OAuth Callback] Rejected callback due to invalid or expired state.");
      res.redirect("http://localhost:5173/content-studio?error=invalid_state");
      return;
    }

    // Process OAuth callback via MetaService orchestrator
    const result = await metaService.handleCallback(code as string, payload.userId);

    res.redirect(
      `http://localhost:5173/content-studio?connected=meta&channel=${encodeURIComponent(result.accountName)}`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Meta OAuth callback failed";
    console.error("Meta callback error:", message);
    res.redirect(`http://localhost:5173/content-studio?error=${encodeURIComponent(message)}`);
  }
});

export default router;
