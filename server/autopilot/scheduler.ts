/**
 * Autopilot Scheduler
 * Background CRON-like scheduler that auto-publishes queued videos.
 * Runs every 5 minutes, checks for videos due for publishing, and uploads them.
 */

import { db } from "../db";
import { uploadToYouTube } from "../integrations/youtube/upload";
import { syncYouTubeData } from "../integrations/youtube/sync";
import { fetchDetailedAnalytics } from "../integrations/youtube/detailed-analytics";
import { createNotification } from "./queue-manager";
import { recordPublishBehavior } from "./behavior-engine";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds for immediate scheduled publishing
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Start the autopilot scheduler (runs every 30 seconds).
 */
export function startAutopilotScheduler(): void {
  if (schedulerInterval) {
    console.log("[Autopilot Scheduler] Already running.");
    return;
  }

  console.log("🤖 Autopilot Scheduler started (checking every 30 seconds)");

  // Run immediately once, then every 30 seconds
  processQueue().catch(err => {
    console.error("[Autopilot Scheduler] Initial run failed:", err instanceof Error ? err.message : err);
  });

  schedulerInterval = setInterval(() => {
    processQueue().catch(err => {
      console.error("[Autopilot Scheduler] Tick failed:", err instanceof Error ? err.message : err);
    });
  }, CHECK_INTERVAL);
}

/**
 * Stop the autopilot scheduler.
 */
export function stopAutopilotScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Autopilot Scheduler] Stopped.");
  }
}

/**
 * Main processing loop: find due items and publish them.
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    console.log("[Autopilot Scheduler] Already processing, skipping tick.");
    return;
  }

  isProcessing = true;

  try {
    const now = new Date().toISOString();

    // Find all scheduled items that are due (scheduled_at <= now)
    const dueItems = await db.execute({
      sql: `SELECT aq.*, aps.pause_queue
            FROM autopilot_queue aq
            LEFT JOIN autopilot_settings aps ON aq.user_id = aps.user_id
            WHERE aq.status = 'scheduled'
              AND aq.scheduled_at IS NOT NULL
              AND aq.scheduled_at <= ?
            ORDER BY aq.scheduled_at ASC
            LIMIT 10`,
      args: [now],
    });

    if (dueItems.rows.length === 0) {
      return; // Nothing to process
    }

    console.log(`[Autopilot Scheduler] Found ${dueItems.rows.length} video(s) due for publishing`);

    for (const item of dueItems.rows) {
      const userId = item.user_id as string;
      const itemId = item.id as string;
      const isPaused = !!(item.pause_queue as number);

      // Skip if user's queue is paused
      if (isPaused) {
        console.log(`[Autopilot Scheduler] Queue paused for user ${userId.substring(0, 8)}..., skipping ${itemId}`);
        continue;
      }

      // Check YouTube daily quota (max 6 uploads per day per user)
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const publishedToday = await db.execute({
        sql: `SELECT COUNT(*) as count FROM autopilot_queue
              WHERE user_id = ? AND status = 'published' AND platform = 'youtube'
              AND published_at >= ?`,
        args: [userId, todayStart.toISOString()],
      });

      const todayCount = (publishedToday.rows[0]?.count as number) || 0;
      if (todayCount >= 6) {
        console.log(`[Autopilot Scheduler] YouTube daily quota reached for user ${userId.substring(0, 8)}... (${todayCount}/6). Skipping.`);

        await createNotification(
          userId,
          "⚠️ Daily Quota Reached",
          `YouTube daily upload quota reached (${todayCount}/6). Remaining videos will be published tomorrow.`,
          "warning",
          itemId
        );
        continue;
      }

      // Publish the video
      await publishQueueItem(userId, itemId, item);
    }
  } catch (err) {
    console.error("[Autopilot Scheduler] Process error:", err instanceof Error ? err.message : err);
  } finally {
    isProcessing = false;
  }
}

/**
 * Publish a single queue item to the target platform.
 */
export async function publishQueueItem(
  userId: string,
  itemId: string,
  item?: Record<string, unknown>
): Promise<void> {
  if (!item) {
    const query = await db.execute({
      sql: "SELECT * FROM autopilot_queue WHERE id = ? AND user_id = ?",
      args: [itemId, userId],
    });
    if (query.rows.length === 0) throw new Error("Queue item not found");
    item = query.rows[0];
  }
  const fileName = item.file_name as string;
  const title = (item.title as string) || fileName;
  const platform = (item.platform as string) || "youtube";

  console.log(`[Autopilot Scheduler] Publishing "${title}" to ${platform} for user ${userId.substring(0, 8)}...`);

  // Mark as publishing
  await db.execute({
    sql: "UPDATE autopilot_queue SET status = 'publishing', updated_at = datetime('now') WHERE id = ?",
    args: [itemId],
  });

  await createNotification(
    userId,
    "🚀 Publishing Started",
    `"${title}" is being uploaded to ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`,
    "info",
    itemId
  );

  try {
    if (platform === "youtube") {
      await publishToYouTube(userId, itemId, item);
    } else {
      // Future platform support
      throw new Error(`${platform} auto-publishing is not yet configured. Video saved as draft.`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Publishing failed";
    console.error(`[Autopilot Scheduler] Failed to publish ${itemId}:`, errorMsg);

    await db.execute({
      sql: "UPDATE autopilot_queue SET status = 'failed', publish_error = ?, updated_at = datetime('now') WHERE id = ?",
      args: [errorMsg, itemId],
    });

    await createNotification(
      userId,
      "❌ Upload Failed",
      `Failed to publish "${title}" to ${platform}: ${errorMsg}`,
      "error",
      itemId
    );
  }
}

/**
 * Publish a video to YouTube using the existing upload integration.
 */
async function publishToYouTube(
  userId: string,
  itemId: string,
  item: Record<string, unknown>
): Promise<void> {
  const filePath = item.file_path as string;
  const title = (item.title as string) || (item.file_name as string);
  const description = (item.description as string) || "";
  const tagsRaw = item.tags as string;
  const tags = safeParseJSON<string[]>(tagsRaw, []);
  const categoryId = (item.category_id as string) || "22";
  const visibility = (item.visibility as string) || "public";
  const playlistId = item.playlist_id as string | null;
  const license = (item.license as string) || "youtube";
  const notifySubscribers = !!(item.notify_subscribers as number);
  const madeForKids = !!(item.made_for_kids as number);
  const language = (item.language as string) || "en";
  const customThumbPath = item.custom_thumbnail_path as string | null;
  const thumbnailPath = item.thumbnail_path as string | null;

  // Resolve thumbnail: check custom thumbnail path first, then temp-frames relative
  let resolvedThumbnail: string | undefined = undefined;
  if (customThumbPath && fs.existsSync(path.resolve(customThumbPath))) {
    resolvedThumbnail = path.resolve(customThumbPath);
    console.log(`[Autopilot Scheduler] Using custom thumbnail for item ${itemId}: ${resolvedThumbnail}`);
  } else if (thumbnailPath) {
    const candidateTemp = path.resolve("server/uploads/temp-frames", thumbnailPath);
    const candidateDirect = path.resolve(thumbnailPath);
    if (fs.existsSync(candidateTemp)) {
      resolvedThumbnail = candidateTemp;
    } else if (fs.existsSync(candidateDirect)) {
      resolvedThumbnail = candidateDirect;
    }
  }

  const result = await uploadToYouTube(userId, {
    title,
    description,
    tags,
    videoFilePath: filePath,
    thumbnailPath: resolvedThumbnail,
    visibility: visibility as "public" | "private" | "unlisted",
    categoryId,
    playlistId: playlistId || undefined,
    license: license as "youtube" | "creativeCommon",
    notifySubscribers,
    madeForKids,
    language,
  });

  // Update queue item with success
  await db.execute({
    sql: `UPDATE autopilot_queue SET
          status = 'published',
          platform_video_id = ?,
          platform_url = ?,
          publish_error = NULL,
          published_at = datetime('now'),
          updated_at = datetime('now')
          WHERE id = ?`,
    args: [result.platformVideoId, result.url, itemId],
  });

  // Sync to uploads & published_posts tables (best-effort, non-blocking)
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO uploads (id, user_id, title, description, tags, file_path, file_name, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      args: [itemId, userId, title, description, JSON.stringify(tags), filePath, (item.file_name as string) || "video.mp4", (item.file_size as number) || 0],
    });

    const publishId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO published_posts (id, upload_id, user_id, platform, platform_video_id, platform_url, status, published_at, metadata)
            VALUES (?, ?, ?, 'youtube', ?, ?, 'published', datetime('now'), ?)`,
      args: [
        publishId, itemId, userId,
        result.platformVideoId, result.url,
        JSON.stringify({ source: "autopilot", channelId: result.channelId }),
      ],
    });
  } catch (syncErr) {
    console.warn("[Autopilot Scheduler] Published_posts table sync warning (non-fatal):", syncErr instanceof Error ? syncErr.message : syncErr);
  }

  // Record publish behavior for AI learning
  try {
    const videoType = (item.category_id as string) || "22";
    await recordPublishBehavior(userId, "youtube", videoType);
  } catch { /* non-blocking */ }

  // Create a calendar event for the published video
  try {
    const calendarId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO calendar_events (id, user_id, title, description, event_type, platform, start_time, status, color, video_id)
            VALUES (?, ?, ?, ?, 'upload', 'youtube', datetime('now'), 'completed', '#22c55e', ?)`,
      args: [calendarId, userId, `✅ Published: ${title}`, `Auto-published via Autopilot Queue`, result.platformVideoId],
    });
  } catch {
    // Calendar event is optional
  }

  // Send success notification
  await createNotification(
    userId,
    "✅ Video Published!",
    `"${title}" has been successfully published to YouTube!\n\n🔗 ${result.url}`,
    "success",
    itemId,
    { videoId: result.platformVideoId, url: result.url }
  );

  console.log(`[Autopilot Scheduler] ✅ Published "${title}" → ${result.url}`);

  // Trigger background sync
  syncYouTubeData(userId).catch(err => {
    console.warn("[Autopilot Scheduler] Post-publish sync failed:", err instanceof Error ? err.message : err);
  });
  fetchDetailedAnalytics(userId).catch(err => {
    console.warn("[Autopilot Scheduler] Post-publish analytics failed:", err instanceof Error ? err.message : err);
  });
}

function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}
