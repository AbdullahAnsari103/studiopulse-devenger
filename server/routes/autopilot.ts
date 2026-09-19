/**
 * Autopilot Queue API Routes
 * Handles bulk video uploads, AI metadata generation, queue management,
 * scheduling, notifications, and settings.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  addToQueue,
  updateQueueItemMetadata,
  buildSchedule,
  getQueueItems,
  getQueueItem,
  getQueueStats,
  cancelQueueItem,
  deleteQueueItem,
  clearQueueByStatus,
  reorderQueue,
  getUserSettings,
  updateUserSettings,
  createNotification,
  getNotifications,
  markNotificationsRead,
} from "../autopilot/queue-manager";
import {
  generateVideoMetadata,
  detectAspectRatio,
  classifyPlatform,
  getOptimalPublishTime,
} from "../autopilot/ai-pipeline";
import { publishQueueItem } from "../autopilot/scheduler";
import { getUserBehaviorProfile, recordUploadBehavior } from "../autopilot/behavior-engine";
import { db } from "../db";

const router = Router();

// ─── File Upload Configuration ────────────────────────────────────────────────

const AUTOPILOT_UPLOADS_DIR = path.resolve("server/uploads/autopilot");
if (!fs.existsSync(AUTOPILOT_UPLOADS_DIR)) {
  fs.mkdirSync(AUTOPILOT_UPLOADS_DIR, { recursive: true });
}

const autopilotStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUTOPILOT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `autopilot-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_VIDEO_TYPES = [
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "video/x-matroska", "video/webm", "video/mpeg",
  "application/octet-stream",
];

const uploadVideos = multer({
  storage: autopilotStorage,
  limits: {
    fileSize: 8 * 1024 * 1024 * 1024, // 8GB max per video file
    fieldSize: 500 * 1024 * 1024,      // 500MB for text fields (videoFramesMap base64 frames)
    fields: 50,                         // max 50 non-file fields
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype) || file.originalname.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// ─── BULK UPLOAD ──────────────────────────────────────────────────────────────

/**
 * POST /api/autopilot/bulk-upload
 * Upload multiple videos to the autopilot queue.
 * Accepts up to 50 video files + optional per-video context.
 */
router.post("/bulk-upload", uploadVideos.array("videos", 50), async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No video files uploaded" });
      return;
    }

    const batchId = crypto.randomUUID();
    const contexts: string[] = [];
    let videoFramesMap: Record<number, { base64: string; mimeType: string }[]> = {};

    // Parse per-video contexts (sent as JSON array in body)
    try {
      const rawContexts = req.body.contexts;
      if (rawContexts) {
        const parsed = typeof rawContexts === "string" ? JSON.parse(rawContexts) : rawContexts;
        if (Array.isArray(parsed)) {
          contexts.push(...parsed);
        }
      }
    } catch {
      // No contexts provided
    }

    // Parse browser-extracted video frames map if provided
    try {
      const rawFramesMap = req.body.videoFramesMap;
      if (rawFramesMap) {
        videoFramesMap = typeof rawFramesMap === "string" ? JSON.parse(rawFramesMap) : rawFramesMap;
      }
    } catch {
      // No frames map provided
    }

    // Parse platforms list (multi-platform support)
    let uploadPlatforms: string[] = ["youtube"];
    try {
      const rawPlatforms = req.body.platforms;
      if (rawPlatforms) {
        const parsed = typeof rawPlatforms === "string" ? JSON.parse(rawPlatforms) : rawPlatforms;
        if (Array.isArray(parsed) && parsed.length > 0) uploadPlatforms = parsed;
      }
    } catch { /* fallback to youtube */ }

    // Parse custom thumbnails map (sent as JSON: { "0": "data:image/...base64...", ... })
    let customThumbnailsMap: Record<string, string> = {};
    try {
      const rawCustomThumbs = req.body.customThumbnails;
      if (rawCustomThumbs) {
        customThumbnailsMap = typeof rawCustomThumbs === "string" ? JSON.parse(rawCustomThumbs) : rawCustomThumbs;
      }
    } catch {
      // No custom thumbnails provided
    }

    const THUMBNAILS_DIR = path.resolve("server/uploads/thumbnails");
    if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

    const queueIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const userContext = contexts[i] || req.body.globalContext || "";

      const queueId = await addToQueue(
        userId,
        file.path,
        file.originalname,
        file.size,
        batchId,
        i,
        userContext,
        uploadPlatforms[0] || "youtube"
      );

      // Set platforms array on the newly created queue item
      try {
        await db.execute({
          sql: "UPDATE autopilot_queue SET platforms = ? WHERE id = ?",
          args: [JSON.stringify(uploadPlatforms), queueId],
        });
      } catch { /* best-effort */ }

      const customThumbDataUrl = customThumbnailsMap[String(i)];
      let customSaved = false;

      // Ensure temp-frames directory exists for this item
      const tempDir = path.resolve(`server/uploads/temp-frames/${queueId}`);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      // If user provided a custom thumbnail for this video, save it first
      if (customThumbDataUrl && customThumbDataUrl.startsWith("data:image/")) {
        try {
          const matches = customThumbDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            const imgExt = matches[1] === "jpeg" ? "jpg" : matches[1];
            const imgBuffer = Buffer.from(matches[2], "base64");
            const thumbFileName = `custom-thumb-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${imgExt}`;
            const thumbFilePath = path.join(THUMBNAILS_DIR, thumbFileName);
            fs.writeFileSync(thumbFilePath, imgBuffer);

            // Also write directly into temp-frames directory for seamless static serving & preview
            const frameThumbPath = path.join(tempDir, `custom-thumbnail.${imgExt}`);
            fs.writeFileSync(frameThumbPath, imgBuffer);

            const customRelPath = `${queueId}/custom-thumbnail.${imgExt}`;
            await db.execute({
              sql: "UPDATE autopilot_queue SET thumbnail_path = ?, custom_thumbnail_path = ? WHERE id = ?",
              args: [customRelPath, thumbFilePath, queueId],
            });

            customSaved = true;
            console.log(`[Autopilot] Custom thumbnail saved for item ${queueId}: ${thumbFileName} (${(imgBuffer.length / 1024).toFixed(0)} KB)`);
          }
        } catch (thumbErr) {
          console.warn(`[Autopilot] Failed to save custom thumbnail for video ${i}:`, thumbErr instanceof Error ? thumbErr.message : thumbErr);
        }
      }

      // Save browser-extracted frames to disk for AI pipeline
      const itemFrames = videoFramesMap[i] || [];
      if (Array.isArray(itemFrames) && itemFrames.length > 0) {
        itemFrames.forEach((frame, fIdx) => {
          if (frame && frame.base64) {
            const framePath = path.join(tempDir, `browser-frame-${fIdx}.jpg`);
            try {
              fs.writeFileSync(framePath, Buffer.from(frame.base64, "base64"));
            } catch { /* best-effort write */ }
          }
        });

        // Only set auto frame as thumbnail_path if no custom thumbnail was provided
        if (!customSaved) {
          const bestIdx = Math.floor(itemFrames.length / 2);
          const thumbnailRelPath = `${queueId}/browser-frame-${bestIdx}.jpg`;
          try {
            await db.execute({
              sql: "UPDATE autopilot_queue SET thumbnail_path = ? WHERE id = ?",
              args: [thumbnailRelPath, queueId],
            });
          } catch { /* best-effort */ }
        }

        console.log(`[Autopilot] Saved ${itemFrames.length} browser-extracted visual frames for item ${queueId}`);
      }

      queueIds.push(queueId);
    }

    // Record behavior for AI learning (best-effort)
    try {
      const videoType = req.body.videoType || "other";
      const visibility = req.body.visibility || "public";
      await recordUploadBehavior(userId, videoType, uploadPlatforms, visibility);
    } catch { /* non-blocking */ }

    // Create notification
    await createNotification(
      userId,
      "📦 Bulk Upload Complete",
      `${files.length} video(s) uploaded successfully to the Autopilot Queue. AI processing will begin shortly.`,
      "success",
      undefined,
      { batchId, videoCount: files.length }
    );

    console.log(`[Autopilot] Bulk upload: ${files.length} videos queued (batch: ${batchId})`);

    res.json({
      success: true,
      batchId,
      videoCount: files.length,
      queueIds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bulk upload failed";
    console.error("[Autopilot] Bulk upload error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── AI METADATA GENERATION ──────────────────────────────────────────────────

/**
 * POST /api/autopilot/queue/:id/generate-metadata
 * Generate or re-generate optimized AI metadata for a single video item in <3s.
 */
router.post("/queue/:id/generate-metadata", async (req: Request, res: Response) => {
  try {
    const { userId, userContext } = req.body;
    const { id } = req.params;

    if (!userId || !id) {
      res.status(400).json({ error: "userId and itemId are required" });
      return;
    }

    const item = await getQueueItem(id);
    if (!item || item.userId !== userId) {
      res.status(404).json({ error: "Queue item not found" });
      return;
    }

    console.log(`[Autopilot AI] Single item metadata generation requested for: ${item.fileName}`);

    // Generate AI metadata immediately (<3s)
    const aiResult = await generateVideoMetadata(
      item.filePath,
      item.fileName,
      userContext || item.userContext || "",
      userId,
      item.id
    );

    const settings = await getUserSettings(userId);
    if (settings.autoClassify) {
      const aspectRatio = await detectAspectRatio(item.filePath);
      aiResult.aspectRatio = aspectRatio;
    }

    const scheduleTime = item.scheduledAt || new Date(Date.now() + 3600000).toISOString();
    await updateQueueItemMetadata(item.id, aiResult, scheduleTime, "ai");

    const updated = await getQueueItem(id);

    res.json({
      success: true,
      item: updated,
      metadata: aiResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate metadata";
    console.error("[Autopilot] Single generate-metadata error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/generate-metadata
 * Trigger AI metadata generation for a batch of queued videos.
 */
router.post("/generate-metadata", async (req: Request, res: Response) => {
  try {
    const { userId, batchId } = req.body;
    if (!userId || !batchId) {
      res.status(400).json({ error: "userId and batchId are required" });
      return;
    }

    // Get all pending or ai_processing items in this batch
    const allBatchItems = await getQueueItems(userId, { batchId });
    const items = allBatchItems.filter(i => i.status === "pending" || i.status === "ai_processing");
    if (items.length === 0) {
      res.status(404).json({ error: "No pending items found for this batch" });
      return;
    }

    // Get user settings
    const settings = await getUserSettings(userId);

    // Mark all as AI processing
    for (const item of items) {
      await db.execute({
        sql: "UPDATE autopilot_queue SET status = 'ai_processing', updated_at = datetime('now') WHERE id = ?",
        args: [item.id],
      });
    }

    await createNotification(
      userId,
      "🤖 AI Processing Started",
      `Studio AI is analyzing ${items.length} video(s) and generating optimized metadata...`,
      "info",
      undefined,
      { batchId }
    );

    // Process each video (send immediate response, process in background)
    res.json({
      success: true,
      message: `AI processing started for ${items.length} video(s)`,
      batchId,
      itemCount: items.length,
    });

    // Background processing
    processMetadataBatch(userId, batchId, items, settings).catch(err => {
      console.error("[Autopilot] Background metadata generation failed:", err instanceof Error ? err.message : err);
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Metadata generation failed";
    console.error("[Autopilot] Generate metadata error:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * Background: Process AI metadata for a batch.
 */
async function processMetadataBatch(
  userId: string,
  batchId: string,
  items: Awaited<ReturnType<typeof getQueueItems>>,
  settings: Awaited<ReturnType<typeof getUserSettings>>
): Promise<void> {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      console.log(`[Autopilot AI] Processing ${i + 1}/${items.length}: ${item.fileName}`);

      // Generate AI metadata (uses pre-extracted browser frames from disk if available)
      const aiResult = await generateVideoMetadata(
        item.filePath,
        item.fileName,
        item.userContext || "",
        userId,
        item.id
      );

      // Auto-classify platform if enabled
      if (settings.autoClassify) {
        const aspectRatio = await detectAspectRatio(item.filePath);
        const suggestedPlatforms = classifyPlatform(aiResult.durationSeconds, aspectRatio);
        aiResult.aspectRatio = aspectRatio;
      }

      // Compute schedule
      const scheduleResult = await getOptimalPublishTime(userId, i, settings.maxPerDay, settings.preferredTime, settings.timezone);

      // Update queue item
      await updateQueueItemMetadata(
        item.id,
        aiResult,
        scheduleResult.scheduledAt,
        "ai"
      );

      await createNotification(
        userId,
        "✅ AI Metadata Ready",
        `"${aiResult.title}" — metadata generated. Scheduled for ${new Date(scheduleResult.scheduledAt).toLocaleString()}.`,
        "success",
        item.id,
        { title: aiResult.title, seoScore: aiResult.seoScore }
      );

      successCount++;
    } catch (err) {
      failCount++;
      const errMsg = err instanceof Error ? err.message : "AI processing failed";
      console.error(`[Autopilot AI] Failed for ${item.fileName}:`, errMsg);

      await db.execute({
        sql: "UPDATE autopilot_queue SET status = 'failed', publish_error = ?, updated_at = datetime('now') WHERE id = ?",
        args: [`AI processing failed: ${errMsg}`, item.id],
      });

      await createNotification(
        userId,
        "❌ AI Processing Failed",
        `Failed to generate metadata for "${item.fileName}": ${errMsg}`,
        "error",
        item.id
      );
    }

    // Small delay between AI calls to avoid rate limiting
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final batch notification
  await createNotification(
    userId,
    "🎯 Batch Processing Complete",
    `AI processed ${successCount + failCount} video(s): ${successCount} successful, ${failCount} failed. ${successCount > 0 ? "Videos are scheduled for auto-publishing!" : ""}`,
    successCount > 0 ? "success" : "error",
    undefined,
    { batchId, successCount, failCount }
  );
}

// ─── QUEUE MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * GET /api/autopilot/queue
 * Get queue items for a user.
 */
router.get("/queue", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const items = await getQueueItems(userId, {
      batchId: req.query.batchId as string,
      status: req.query.status as string,
      limit: parseInt(req.query.limit as string) || 100,
    });

    res.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch queue";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/autopilot/queue/:id
 * Update a queue item (edit metadata, reschedule, etc).
 */
router.put("/queue/:id", async (req: Request, res: Response) => {
  try {
    const { userId, title, description, tags, scheduledAt, visibility, platform, platforms, userContext, categoryId, customThumbnail } = req.body;
    const itemId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const updates: string[] = [];
    const args: unknown[] = [];

    if (title !== undefined) { updates.push("title = ?"); args.push(title); }
    if (description !== undefined) { updates.push("description = ?"); args.push(description); }
    if (tags !== undefined) { updates.push("tags = ?"); args.push(JSON.stringify(tags)); }
    if (scheduledAt !== undefined) { updates.push("scheduled_at = ?"); args.push(scheduledAt); }
    if (visibility !== undefined) { updates.push("visibility = ?"); args.push(visibility); }
    if (platform !== undefined) { updates.push("platform = ?"); args.push(platform); }
    if (platforms !== undefined) { updates.push("platforms = ?"); args.push(JSON.stringify(platforms)); }
    if (userContext !== undefined) { updates.push("user_context = ?"); args.push(userContext); }
    if (categoryId !== undefined) { updates.push("category_id = ?"); args.push(categoryId); }

    // Handle custom thumbnail base64 dataUrl if passed in edit
    if (customThumbnail && typeof customThumbnail === "string" && customThumbnail.startsWith("data:image/")) {
      try {
        const matches = customThumbnail.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const imgExt = matches[1] === "jpeg" ? "jpg" : matches[1];
          const imgBuffer = Buffer.from(matches[2], "base64");

          const THUMBNAILS_DIR = path.resolve("server/uploads/thumbnails");
          if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
          const thumbFileName = `custom-thumb-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${imgExt}`;
          const thumbFilePath = path.join(THUMBNAILS_DIR, thumbFileName);
          fs.writeFileSync(thumbFilePath, imgBuffer);

          const tempDir = path.resolve(`server/uploads/temp-frames/${itemId}`);
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const frameThumbPath = path.join(tempDir, `custom-thumbnail.${imgExt}`);
          fs.writeFileSync(frameThumbPath, imgBuffer);

          const customRelPath = `${itemId}/custom-thumbnail.${imgExt}`;
          updates.push("thumbnail_path = ?");
          args.push(customRelPath);
          updates.push("custom_thumbnail_path = ?");
          args.push(thumbFilePath);
        }
      } catch (err) {
        console.warn("[Autopilot] Failed to save custom thumbnail in PUT /queue/:id:", err);
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      args.push(itemId, userId);
      await db.execute({
        sql: `UPDATE autopilot_queue SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
        args,
      });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/queue/:id/thumbnail
 * Upload or update custom thumbnail for a queue item via direct file or data URL.
 */
router.post("/queue/:id/thumbnail", async (req: Request, res: Response) => {
  try {
    const { userId, customThumbnail } = req.body;
    const itemId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (!customThumbnail || typeof customThumbnail !== "string" || !customThumbnail.startsWith("data:image/")) {
      res.status(400).json({ error: "Valid base64 image dataUrl is required" });
      return;
    }

    const matches = customThumbnail.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: "Invalid image format" });
      return;
    }

    const imgExt = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imgBuffer = Buffer.from(matches[2], "base64");

    const THUMBNAILS_DIR = path.resolve("server/uploads/thumbnails");
    if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    const thumbFileName = `custom-thumb-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${imgExt}`;
    const thumbFilePath = path.join(THUMBNAILS_DIR, thumbFileName);
    fs.writeFileSync(thumbFilePath, imgBuffer);

    const tempDir = path.resolve(`server/uploads/temp-frames/${itemId}`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const frameThumbPath = path.join(tempDir, `custom-thumbnail.${imgExt}`);
    fs.writeFileSync(frameThumbPath, imgBuffer);

    const customRelPath = `${itemId}/custom-thumbnail.${imgExt}`;
    await db.execute({
      sql: `UPDATE autopilot_queue SET thumbnail_path = ?, custom_thumbnail_path = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      args: [customRelPath, thumbFilePath, itemId, userId],
    });

    res.json({
      success: true,
      thumbnailPath: customRelPath,
      customThumbnailPath: thumbFilePath,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Thumbnail upload failed";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/autopilot/queue/:id
 * Permanently delete or cancel a queue item and its video file.
 */
router.delete("/queue/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const itemId = req.params.id;
    const permanent = req.query.permanent !== "false"; // default to permanent delete

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    if (permanent) {
      await deleteQueueItem(userId, itemId);
    } else {
      await cancelQueueItem(userId, itemId);
    }

    res.json({ success: true, deleted: permanent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/queue/clear
 * Clear items by status (e.g., cancelled, failed).
 */
router.post("/queue/clear", async (req: Request, res: Response) => {
  try {
    const { userId, statuses } = req.body;
    if (!userId || !Array.isArray(statuses)) {
      res.status(400).json({ error: "userId and statuses array are required" });
      return;
    }

    const clearedCount = await clearQueueByStatus(userId, statuses);
    res.json({ success: true, clearedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Clear queue failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/queue/reorder
 * Reorder queue items.
 */
router.post("/queue/reorder", async (req: Request, res: Response) => {
  try {
    const { userId, orderedIds } = req.body;
    if (!userId || !Array.isArray(orderedIds)) {
      res.status(400).json({ error: "userId and orderedIds array are required" });
      return;
    }

    await reorderQueue(userId, orderedIds);
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Reorder failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/pause
 * Pause the entire queue.
 */
router.post("/pause", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await updateUserSettings(userId, { pauseQueue: true });
    await createNotification(userId, "⏸️ Queue Paused", "Autopilot queue has been paused. No videos will be auto-published until resumed.", "warning");
    res.json({ success: true, paused: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Pause failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/resume
 * Resume the queue.
 */
router.post("/resume", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await updateUserSettings(userId, { pauseQueue: false });
    await createNotification(userId, "▶️ Queue Resumed", "Autopilot queue resumed. Scheduled videos will be published automatically.", "success");
    res.json({ success: true, paused: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Resume failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/publish-now/:id
 * Force-publish a specific item immediately (bypasses cron delay).
 */
router.post("/publish-now/:id", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const itemId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Check item exists
    const query = await db.execute({
      sql: "SELECT * FROM autopilot_queue WHERE id = ? AND user_id = ?",
      args: [itemId, userId],
    });

    if (query.rows.length === 0) {
      res.status(404).json({ error: "Queue item not found" });
      return;
    }

    const item = query.rows[0];

    // Mark status as publishing immediately
    await db.execute({
      sql: "UPDATE autopilot_queue SET status = 'publishing', scheduled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      args: [itemId],
    });

    res.json({ success: true, message: "Immediate publishing started" });

    // Execute upload asynchronously in background right now
    publishQueueItem(userId, itemId, item).catch(err => {
      console.error(`[Autopilot] Immediate publish failed for ${itemId}:`, err instanceof Error ? err.message : err);
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Publish now failed";
    res.status(500).json({ error: message });
  }
});

// ─── STATISTICS ───────────────────────────────────────────────────────────────

/**
 * GET /api/autopilot/stats
 * Get queue statistics.
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const stats = await getQueueStats(userId);
    res.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch stats";
    res.status(500).json({ error: message });
  }
});

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

/**
 * GET /api/autopilot/settings
 */
router.get("/settings", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const settings = await getUserSettings(userId);
    res.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/autopilot/settings
 */
router.put("/settings", async (req: Request, res: Response) => {
  try {
    const { userId, ...settings } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await updateUserSettings(userId, settings);
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    res.status(500).json({ error: message });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

/**
 * GET /api/autopilot/notifications
 */
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const unreadOnly = req.query.unreadOnly === "true";
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await getNotifications(userId, limit, unreadOnly);
    res.json({ notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/autopilot/notifications/read
 */
router.post("/notifications/read", async (req: Request, res: Response) => {
  try {
    const { userId, notificationIds } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await markNotificationsRead(userId, notificationIds);
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to mark as read";
    res.status(500).json({ error: message });
  }
});

// ─── RESCHEDULE BATCH ─────────────────────────────────────────────────────────

/**
 * POST /api/autopilot/reschedule
 * Reschedule a batch of videos.
 */
router.post("/reschedule", async (req: Request, res: Response) => {
  try {
    const { userId, batchId, scheduleMode, maxPerDay, preferredTime, timezone, startDate } = req.body;
    if (!userId || !batchId) {
      res.status(400).json({ error: "userId and batchId are required" });
      return;
    }

    const schedule = await buildSchedule(
      userId, batchId,
      scheduleMode || "ai",
      maxPerDay || 1,
      preferredTime || "16:00",
      timezone || "UTC",
      startDate
    );

    await createNotification(
      userId,
      "📅 Schedule Updated",
      `Rescheduled ${schedule.length} video(s) with ${scheduleMode === "ai" ? "AI-optimized" : "custom"} timing.`,
      "info"
    );

    res.json({ success: true, schedule });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Reschedule failed";
    res.status(500).json({ error: message });
  }
});

// ─── BEHAVIOR PROFILE ────────────────────────────────────────────────────────

/**
 * GET /api/autopilot/behavior-profile
 * Returns the user's learned behavior profile with platform & video-type suggestions.
 */
router.get("/behavior-profile", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) { res.status(400).json({ error: "userId is required" }); return; }
    const profile = await getUserBehaviorProfile(userId);
    res.json(profile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get behavior profile";
    res.status(500).json({ error: message });
  }
});

export default router;
