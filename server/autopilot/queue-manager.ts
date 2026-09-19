/**
 * Autopilot Queue Manager
 * Manages the autopilot video queue: add, reorder, cancel, pause/resume, schedule.
 */

import crypto from "crypto";
import { db } from "../db";
import { getOptimalPublishTime, type AutopilotAIResult } from "./ai-pipeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  thumbnailPath: string | null;
  customThumbnailPath: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  categoryId: string;
  platform: string;
  platforms: string[];
  scheduledAt: string | null;
  scheduleMode: string;
  visibility: string;
  playlistId: string | null;
  license: string;
  notifySubscribers: boolean;
  madeForKids: boolean;
  language: string;
  queueOrder: number;
  batchId: string;
  status: string;
  platformVideoId: string | null;
  platformUrl: string | null;
  publishError: string | null;
  aiMetadata: AutopilotAIResult | null;
  aiContentSummary: string | null;
  userContext: string | null;
  videoDurationSeconds: number;
  aspectRatio: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface QueueStats {
  total: number;
  pending: number;
  aiProcessing: number;
  scheduled: number;
  publishing: number;
  published: number;
  failed: number;
  cancelled: number;
  nextPublishAt: string | null;
  isPaused: boolean;
}

export interface AutopilotSettings {
  defaultPlatform: string;
  defaultVisibility: string;
  maxPerDay: number;
  preferredTime: string;
  timezone: string;
  autoClassify: boolean;
  autoMetadata: boolean;
  notifyOnPublish: boolean;
  pauseQueue: boolean;
}

// ─── Queue Operations ────────────────────────────────────────────────────────

/**
 * Add a video to the autopilot queue.
 */
export async function addToQueue(
  userId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  batchId: string,
  queueOrder: number,
  userContext?: string,
  platform?: string
): Promise<string> {
  const id = crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO autopilot_queue (id, user_id, file_name, file_path, file_size, batch_id, queue_order, user_context, platform, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    args: [id, userId, fileName, filePath, fileSize, batchId, queueOrder, userContext || null, platform || "youtube"],
  });

  console.log(`[Queue] Added video to queue: ${fileName} (${id})`);
  return id;
}

/**
 * Update a queue item with AI-generated metadata.
 */
export async function updateQueueItemMetadata(
  itemId: string,
  aiResult: AutopilotAIResult,
  scheduledAt: string,
  scheduleMode: string = "ai"
): Promise<void> {
  await db.execute({
    sql: `UPDATE autopilot_queue SET
          title = ?, description = ?, tags = ?, category_id = ?,
          scheduled_at = ?, schedule_mode = ?,
          ai_metadata = ?, ai_content_summary = ?,
          video_duration_seconds = ?, aspect_ratio = ?,
          platforms = ?, status = 'scheduled',
          updated_at = datetime('now')
          WHERE id = ?`,
    args: [
      aiResult.title, aiResult.description, JSON.stringify(aiResult.tags),
      aiResult.categoryId, scheduledAt, scheduleMode,
      JSON.stringify(aiResult), aiResult.contentSummary,
      aiResult.durationSeconds, aiResult.aspectRatio,
      JSON.stringify(["youtube"]), // Primary: YouTube. Add others when activated
      itemId,
    ],
  });

  console.log(`[Queue] Updated metadata for ${itemId}: "${aiResult.title}"`);
}

/**
 * Build an optimized schedule for a batch of queued videos.
 */
export async function buildSchedule(
  userId: string,
  batchId: string,
  scheduleMode: "ai" | "interval" = "ai",
  maxPerDay: number = 1,
  preferredTime: string = "16:00",
  timezone: string = "UTC",
  startDate?: string
): Promise<{ itemId: string; scheduledAt: string; reasoning: string }[]> {
  const items = await db.execute({
    sql: `SELECT id, queue_order FROM autopilot_queue
          WHERE user_id = ? AND batch_id = ? AND status IN ('pending', 'ai_processing', 'scheduled')
          ORDER BY queue_order ASC`,
    args: [userId, batchId],
  });

  const schedule: { itemId: string; scheduledAt: string; reasoning: string }[] = [];

  for (const row of items.rows) {
    const itemId = row.id as string;
    const queueOrder = row.queue_order as number;

    if (scheduleMode === "ai") {
      const result = await getOptimalPublishTime(userId, queueOrder, maxPerDay, preferredTime, timezone);
      schedule.push({ itemId, scheduledAt: result.scheduledAt, reasoning: result.reasoning });
    } else {
      // Interval mode: spread videos across days from start date
      const start = startDate ? new Date(startDate) : new Date();
      start.setUTCDate(start.getUTCDate() + 1); // Start from tomorrow
      const daysToAdd = Math.floor(queueOrder / maxPerDay);
      const targetDate = new Date(start);
      targetDate.setUTCDate(targetDate.getUTCDate() + daysToAdd);

      const [h, m] = preferredTime.split(":").map(Number);
      targetDate.setUTCHours(h || 16, m || 0, 0, 0);

      schedule.push({
        itemId,
        scheduledAt: targetDate.toISOString(),
        reasoning: `Interval schedule: ${maxPerDay} video(s)/day at ${preferredTime} ${timezone}`,
      });
    }
  }

  // Apply the schedule
  for (const entry of schedule) {
    await db.execute({
      sql: "UPDATE autopilot_queue SET scheduled_at = ?, status = 'scheduled', updated_at = datetime('now') WHERE id = ?",
      args: [entry.scheduledAt, entry.itemId],
    });
  }

  return schedule;
}

/**
 * Get queue items for a user.
 */
export async function getQueueItems(
  userId: string,
  filters?: { batchId?: string; status?: string; limit?: number }
): Promise<QueueItem[]> {
  let sql = "SELECT * FROM autopilot_queue WHERE user_id = ?";
  const args: unknown[] = [userId];

  if (filters?.batchId) {
    sql += " AND batch_id = ?";
    args.push(filters.batchId);
  }
  if (filters?.status && filters.status !== "all") {
    sql += " AND status = ?";
    args.push(filters.status);
  }

  sql += " ORDER BY queue_order ASC, created_at ASC";

  if (filters?.limit) {
    sql += " LIMIT ?";
    args.push(filters.limit);
  }

  const result = await db.execute({ sql, args });

  return result.rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: (row.file_size as number) || 0,
    thumbnailPath: row.thumbnail_path as string | null,
    customThumbnailPath: row.custom_thumbnail_path as string | null,
    title: row.title as string | null,
    description: row.description as string | null,
    tags: safeParseJSON(row.tags as string, []),
    categoryId: (row.category_id as string) || "22",
    platform: (row.platform as string) || "youtube",
    platforms: safeParseJSON(row.platforms as string, ["youtube"]),
    scheduledAt: row.scheduled_at as string | null,
    scheduleMode: (row.schedule_mode as string) || "ai",
    visibility: (row.visibility as string) || "public",
    playlistId: row.playlist_id as string | null,
    license: (row.license as string) || "youtube",
    notifySubscribers: !!(row.notify_subscribers as number),
    madeForKids: !!(row.made_for_kids as number),
    language: (row.language as string) || "en",
    queueOrder: (row.queue_order as number) || 0,
    batchId: (row.batch_id as string) || "",
    status: (row.status as string) || "pending",
    platformVideoId: row.platform_video_id as string | null,
    platformUrl: row.platform_url as string | null,
    publishError: row.publish_error as string | null,
    aiMetadata: safeParseJSON(row.ai_metadata as string, null),
    aiContentSummary: row.ai_content_summary as string | null,
    userContext: row.user_context as string | null,
    videoDurationSeconds: (row.video_duration_seconds as number) || 0,
    aspectRatio: row.aspect_ratio as string | null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
    publishedAt: row.published_at as string | null,
  }));
}

/**
 * Get a single queue item by ID.
 */
export async function getQueueItem(itemId: string): Promise<QueueItem | null> {
  const result = await db.execute({
    sql: "SELECT * FROM autopilot_queue WHERE id = ? LIMIT 1",
    args: [itemId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: (row.file_size as number) || 0,
    thumbnailPath: row.thumbnail_path as string | null,
    customThumbnailPath: row.custom_thumbnail_path as string | null,
    title: row.title as string | null,
    description: row.description as string | null,
    tags: safeParseJSON(row.tags as string, []),
    categoryId: (row.category_id as string) || "22",
    platform: (row.platform as string) || "youtube",
    platforms: safeParseJSON(row.platforms as string, ["youtube"]),
    scheduledAt: row.scheduled_at as string | null,
    scheduleMode: (row.schedule_mode as string) || "ai",
    visibility: (row.visibility as string) || "public",
    playlistId: row.playlist_id as string | null,
    license: (row.license as string) || "youtube",
    notifySubscribers: !!(row.notify_subscribers as number),
    madeForKids: !!(row.made_for_kids as number),
    language: (row.language as string) || "en",
    queueOrder: (row.queue_order as number) || 0,
    batchId: (row.batch_id as string) || "",
    status: (row.status as string) || "pending",
    platformVideoId: row.platform_video_id as string | null,
    platformUrl: row.platform_url as string | null,
    publishError: row.publish_error as string | null,
    aiMetadata: safeParseJSON(row.ai_metadata as string, null),
    aiContentSummary: row.ai_content_summary as string | null,
    userContext: row.user_context as string | null,
    videoDurationSeconds: (row.video_duration_seconds as number) || 0,
    aspectRatio: row.aspect_ratio as string | null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
    publishedAt: row.published_at as string | null,
  };
}

/**
 * Get queue statistics for a user.
 */
export async function getQueueStats(userId: string): Promise<QueueStats> {
  const result = await db.execute({
    sql: `SELECT status, COUNT(*) as count FROM autopilot_queue
          WHERE user_id = ? GROUP BY status`,
    args: [userId],
  });

  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.status as string] = (row.count as number) || 0;
  }

  const nextPublish = await db.execute({
    sql: `SELECT scheduled_at FROM autopilot_queue
          WHERE user_id = ? AND status = 'scheduled' AND scheduled_at IS NOT NULL
          ORDER BY scheduled_at ASC LIMIT 1`,
    args: [userId],
  });

  const settings = await getUserSettings(userId);

  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    pending: counts["pending"] || 0,
    aiProcessing: counts["ai_processing"] || 0,
    scheduled: counts["scheduled"] || 0,
    publishing: counts["publishing"] || 0,
    published: counts["published"] || 0,
    failed: counts["failed"] || 0,
    cancelled: counts["cancelled"] || 0,
    nextPublishAt: nextPublish.rows.length > 0 ? (nextPublish.rows[0].scheduled_at as string) : null,
    isPaused: settings.pauseQueue,
  };
}

/**
 * Cancel a queue item (sets status to cancelled).
 */
export async function cancelQueueItem(userId: string, itemId: string): Promise<void> {
  await db.execute({
    sql: "UPDATE autopilot_queue SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    args: [itemId, userId],
  });
}

/**
 * Permanently delete a queue item and its file from disk.
 */
export async function deleteQueueItem(userId: string, itemId: string): Promise<void> {
  try {
    const fileResult = await db.execute({
      sql: "SELECT file_path FROM autopilot_queue WHERE id = ? AND user_id = ?",
      args: [itemId, userId],
    });

    if (fileResult.rows.length > 0) {
      const filePath = fileResult.rows[0].file_path as string;
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ }
      }
    }
  } catch {
    /* ignore file cleanup errors */
  }

  await db.execute({
    sql: "DELETE FROM autopilot_queue WHERE id = ? AND user_id = ?",
    args: [itemId, userId],
  });
}

/**
 * Clear queue items by status (e.g. 'cancelled', 'failed').
 */
export async function clearQueueByStatus(userId: string, statuses: string[]): Promise<number> {
  if (statuses.length === 0) return 0;
  const placeholders = statuses.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `DELETE FROM autopilot_queue WHERE user_id = ? AND status IN (${placeholders})`,
    args: [userId, ...statuses],
  });
  return result.rowsAffected || 0;
}

/**
 * Reorder queue items.
 */
export async function reorderQueue(userId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute({
      sql: "UPDATE autopilot_queue SET queue_order = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      args: [i, orderedIds[i], userId],
    });
  }
}

/**
 * Get or create user autopilot settings.
 */
export async function getUserSettings(userId: string): Promise<AutopilotSettings> {
  const result = await db.execute({
    sql: "SELECT * FROM autopilot_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO autopilot_settings (user_id) VALUES (?)",
      args: [userId],
    });
    return {
      defaultPlatform: "youtube",
      defaultVisibility: "public",
      maxPerDay: 1,
      preferredTime: "16:00",
      timezone: "UTC",
      autoClassify: true,
      autoMetadata: true,
      notifyOnPublish: true,
      pauseQueue: false,
    };
  }

  const row = result.rows[0];
  return {
    defaultPlatform: (row.default_platform as string) || "youtube",
    defaultVisibility: (row.default_visibility as string) || "public",
    maxPerDay: (row.max_per_day as number) || 1,
    preferredTime: (row.preferred_time as string) || "16:00",
    timezone: (row.timezone as string) || "UTC",
    autoClassify: !!(row.auto_classify as number),
    autoMetadata: !!(row.auto_metadata as number),
    notifyOnPublish: !!(row.notify_on_publish as number),
    pauseQueue: !!(row.pause_queue as number),
  };
}

/**
 * Update user autopilot settings.
 */
export async function updateUserSettings(userId: string, settings: Partial<AutopilotSettings>): Promise<void> {
  // Ensure row exists
  await db.execute({
    sql: "INSERT OR IGNORE INTO autopilot_settings (user_id) VALUES (?)",
    args: [userId],
  });

  const updates: string[] = [];
  const args: unknown[] = [];

  if (settings.defaultPlatform !== undefined) { updates.push("default_platform = ?"); args.push(settings.defaultPlatform); }
  if (settings.defaultVisibility !== undefined) { updates.push("default_visibility = ?"); args.push(settings.defaultVisibility); }
  if (settings.maxPerDay !== undefined) { updates.push("max_per_day = ?"); args.push(settings.maxPerDay); }
  if (settings.preferredTime !== undefined) { updates.push("preferred_time = ?"); args.push(settings.preferredTime); }
  if (settings.timezone !== undefined) { updates.push("timezone = ?"); args.push(settings.timezone); }
  if (settings.autoClassify !== undefined) { updates.push("auto_classify = ?"); args.push(settings.autoClassify ? 1 : 0); }
  if (settings.autoMetadata !== undefined) { updates.push("auto_metadata = ?"); args.push(settings.autoMetadata ? 1 : 0); }
  if (settings.notifyOnPublish !== undefined) { updates.push("notify_on_publish = ?"); args.push(settings.notifyOnPublish ? 1 : 0); }
  if (settings.pauseQueue !== undefined) { updates.push("pause_queue = ?"); args.push(settings.pauseQueue ? 1 : 0); }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    args.push(userId);
    await db.execute({
      sql: `UPDATE autopilot_settings SET ${updates.join(", ")} WHERE user_id = ?`,
      args,
    });
  }
}

// ─── Notification Helper ─────────────────────────────────────────────────────

/**
 * Create an autopilot notification for the user.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  queueItemId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO autopilot_notifications (id, user_id, queue_item_id, type, title, message, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, queueItemId || null, type, title, message, metadata ? JSON.stringify(metadata) : null],
  });
}

/**
 * Get unread notifications for a user.
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<{ id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string; metadata: Record<string, unknown> | null }[]> {
  let sql = "SELECT * FROM autopilot_notifications WHERE user_id = ?";
  const args: unknown[] = [userId];

  if (unreadOnly) {
    sql += " AND is_read = 0";
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  args.push(limit);

  const result = await db.execute({ sql, args });

  return result.rows.map(row => ({
    id: row.id as string,
    type: (row.type as string) || "info",
    title: (row.title as string) || "",
    message: (row.message as string) || "",
    isRead: !!(row.is_read as number),
    createdAt: (row.created_at as string) || "",
    metadata: safeParseJSON(row.metadata as string, null),
  }));
}

/**
 * Mark notifications as read.
 */
export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => "?").join(", ");
    await db.execute({
      sql: `UPDATE autopilot_notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      args: [userId, ...notificationIds],
    });
  } else {
    await db.execute({
      sql: "UPDATE autopilot_notifications SET is_read = 1 WHERE user_id = ?",
      args: [userId],
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseJSON<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}
