/**
 * Viral Clips Router — Endpoints for AI Viral Clips Studio.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { getPlatformAdapter } from "../integrations/adapters";
import { ClipsProcessor } from "../clips/clips-processor";
import { getClipPublisher } from "../clips/publisher-adapters";
import { db } from "../db";

const router = Router();

// ─── GET /api/viral-clips/videos ─────────────────────────────────────────────
// Fetches the user's real connected YouTube channel videos
router.get("/videos", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const adapter = getPlatformAdapter("youtube");
    const result = await adapter.getVideos(userId, {
      status: (req.query.status as string) || "all",
      search: (req.query.search as string) || "",
      sortBy: (req.query.sortBy as string) || "newest",
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 12,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch channel videos";
    console.error("[ViralClips Route] GET /videos error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/viral-clips/jobs ──────────────────────────────────────────────
// Starts an AI analysis job on a video
router.post("/jobs", async (req: Request, res: Response) => {
  try {
    const { userId, videoId, videoTitle, videoDescription, videoThumbnail, videoDuration, views, publishedAt, selectedGenre, customInstructions } = req.body;

    if (!userId || !videoId || !videoTitle) {
      res.status(400).json({ error: "userId, videoId, and videoTitle are required" });
      return;
    }

    // Look up real description from database if not passed
    let resolvedDescription = videoDescription || "";
    try {
      const dbVideo = await db.execute({
        sql: "SELECT description, title, duration FROM youtube_videos WHERE video_id = ? OR id = ? LIMIT 1",
        args: [videoId, `${userId}-youtube-${videoId}`],
      });
      if (dbVideo.rows?.[0]?.description) {
        resolvedDescription = dbVideo.rows[0].description as string;
      }
    } catch {
      // Ignore db lookup error
    }

    const job = ClipsProcessor.createJob({
      userId,
      videoId,
      videoTitle,
      videoDescription: resolvedDescription,
      videoThumbnail: videoThumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80",
      videoDuration: videoDuration || "10:00",
      views: views ? Number(views) : 0,
      publishedAt: publishedAt || new Date().toISOString(),
      selectedGenre,
      customInstructions,
    });

    res.status(201).json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create clip job";
    console.error("[ViralClips Route] POST /jobs error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/viral-clips/jobs/:jobId/clips/:clipId ────────────────────────
// Edit an existing clip's title, hook, summary, tags, or timestamps
router.patch("/jobs/:jobId/clips/:clipId", async (req: Request, res: Response) => {
  try {
    const { jobId, clipId } = req.params;
    const updates = req.body;

    const updatedClip = ClipsProcessor.updateClip(jobId, clipId, updates);
    if (!updatedClip) {
      res.status(404).json({ error: "Job or clip not found" });
      return;
    }

    res.json({ clip: updatedClip });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update clip";
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/viral-clips/jobs/:jobId/clips ─────────────────────────────────
// Add a custom new clip
router.post("/jobs/:jobId/clips", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const newClip = req.body;

    const createdClip = ClipsProcessor.addClip(jobId, newClip);
    if (!createdClip) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.status(201).json({ clip: createdClip });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add clip";
    res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/viral-clips/jobs/:jobId/clips/:clipId ───────────────────────
// Delete a clip
router.delete("/jobs/:jobId/clips/:clipId", async (req: Request, res: Response) => {
  try {
    const { jobId, clipId } = req.params;
    const success = ClipsProcessor.deleteClip(jobId, clipId);

    if (!success) {
      res.status(404).json({ error: "Clip not found" });
      return;
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete clip";
    res.status(500).json({ error: message });
  }
});

// ─── GET /api/viral-clips/jobs/:id ───────────────────────────────────────────
// Polls job progress (0-100%) and stage states
router.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = ClipsProcessor.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get job status";
    res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/viral-clips/jobs/:id ─────────────────────────────────────────
// Deletes a clip job and cleans up associated files
router.delete("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const success = ClipsProcessor.deleteJob(req.params.id);
    res.json({ success });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete job";
    res.status(500).json({ error: message });
  }
});

// ─── GET /api/viral-clips/jobs ───────────────────────────────────────────────
// Get all recent clip jobs for a user
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const jobs = ClipsProcessor.getJobsByUser(userId);
    res.json({ jobs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get jobs";
    res.status(500).json({ error: message });
  }
});

import { renderVerticalShortMp4 } from "../clips/short-renderer";
import fs from "fs";

// ─── POST /api/viral-clips/publish ───────────────────────────────────────────
// ─── POST /api/viral-clips/publish ───────────────────────────────────────────
// Direct 1-click publish or queue to YouTube Shorts
router.post("/publish", async (req: Request, res: Response) => {
  try {
    const { userId, clipId, title, description, tags, videoPathOrUrl, thumbnailUrl, durationFormatted, startTime, endTime, videoId, platform = "youtube", publishAt, hookText } = req.body;

    if (!userId || !title) {
      res.status(400).json({ error: "userId and title are required" });
      return;
    }

    // Render real 9:16 vertical moving video clip with burned-in captions
    let finalVideoPath = videoPathOrUrl;
    if (!finalVideoPath || !fs.existsSync(finalVideoPath)) {
      let durSec = 30;
      if (durationFormatted) {
        const parts = durationFormatted.split(":").map(Number);
        if (parts.length === 2) durSec = parts[0] * 60 + parts[1];
        else if (parts.length === 1) durSec = parts[0];
      }

      // Use explicit undefined checks — startTime=0 is valid!
      const resolvedStart = startTime !== undefined && startTime !== null ? Number(startTime) : undefined;
      const resolvedEnd = endTime !== undefined && endTime !== null ? Number(endTime) : undefined;

      console.log(`[Publish] 🎬 Rendering clip: videoId=${videoId}, start=${resolvedStart}s, end=${resolvedEnd}s, duration=${durSec}s, hookText="${(hookText || title || "").slice(0, 50)}"`);

      finalVideoPath = await renderVerticalShortMp4({
        clipId: clipId || `clip_${Date.now()}`,
        title,
        hookText: hookText || description || title || "",
        tags: tags || [],
        thumbnailUrl,
        durationSec: durSec,
        startTimeSec: resolvedStart,
        endTimeSec: resolvedEnd,
        videoId: videoId || undefined,
      });

      console.log(`[Publish] Render result: ${finalVideoPath} (exists: ${fs.existsSync(finalVideoPath)}, size: ${fs.existsSync(finalVideoPath) ? (fs.statSync(finalVideoPath).size / 1024 / 1024).toFixed(2) + " MB" : "N/A"})`);
    }

    const publisher = getClipPublisher(platform);
    const validation = publisher.validate({
      userId,
      clipId: clipId || `clip_${Date.now()}`,
      title,
      description: description || "",
      tags: tags || [],
      videoPathOrUrl: finalVideoPath,
      thumbnailUrl,
      durationFormatted,
      publishAt,
      startTimeSec: startTime ? Number(startTime) : undefined,
      endTimeSec: endTime ? Number(endTime) : undefined,
      videoId: videoId || undefined,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const result = await publisher.publish({
      userId,
      clipId: clipId || `clip_${Date.now()}`,
      title,
      description: description || "",
      tags: tags || [],
      videoPathOrUrl: finalVideoPath,
      thumbnailUrl,
      durationFormatted,
      publishAt,
      startTimeSec: startTime ? Number(startTime) : undefined,
      endTimeSec: endTime ? Number(endTime) : undefined,
      videoId: videoId || undefined,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to publish clip";
    console.error("[ViralClips Route] POST /publish error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/viral-clips/autopilot-queue ────────────────────────────────────
// Direct 1-click addition into Autopilot Queue
router.post("/autopilot-queue", async (req: Request, res: Response) => {
  try {
    const { userId, clipId, title, description, tags, videoPathOrUrl, thumbnailUrl, duration, startTime, endTime, videoId, scheduledAt, hookText } = req.body;

    if (!userId || !title) {
      res.status(400).json({ error: "userId and title are required" });
      return;
    }

    const queueId = crypto.randomUUID();
    const finalTitle = title.toLowerCase().includes("#shorts") ? title : `${title.slice(0, 90)} #Shorts`.trim();
    const tagArray = Array.isArray(tags) ? tags : [];
    const finalDescription = `${description || ""}\n\nGenerated with Studio Pulse AI\n#Shorts ${tagArray.join(" ")}`;
    
    // Render real 9:16 vertical moving video clip with burned-in captions
    let finalVideoPath = videoPathOrUrl;
    if (!finalVideoPath || !fs.existsSync(finalVideoPath)) {
      const resolvedStart = startTime !== undefined && startTime !== null ? Number(startTime) : undefined;
      const resolvedEnd = endTime !== undefined && endTime !== null ? Number(endTime) : undefined;

      console.log(`[Autopilot Queue] 🎬 Rendering clip: videoId=${videoId}, start=${resolvedStart}s, end=${resolvedEnd}s`);

      finalVideoPath = await renderVerticalShortMp4({
        clipId: clipId || `clip_${Date.now()}`,
        title: finalTitle,
        hookText: hookText || description || finalTitle || "",
        tags: tagArray,
        thumbnailUrl,
        durationSec: duration ? Number(duration) : 30,
        startTimeSec: resolvedStart,
        endTimeSec: resolvedEnd,
        videoId: videoId || undefined,
      });
    }

    // Determine optimal schedule time: if not passed, schedule 2 hours from now
    const targetScheduledAt = scheduledAt || new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // 1. Insert into autopilot_queue table
    await db.execute({
      sql: `
        INSERT INTO autopilot_queue (
          id, user_id, file_name, file_path, file_size, thumbnail_path,
          title, description, tags, category_id, platform, platforms,
          scheduled_at, schedule_mode, visibility, status,
          video_duration_seconds, aspect_ratio, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '22', 'youtube', '["youtube"]', ?, 'ai', 'public', 'scheduled', ?, '9:16', ?, ?)
      `,
      args: [
        queueId,
        userId,
        `${title.slice(0, 40)}.mp4`,
        finalVideoPath,
        fs.existsSync(finalVideoPath) ? fs.statSync(finalVideoPath).size : 0,
        thumbnailUrl || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80",
        finalTitle,
        finalDescription,
        JSON.stringify(tagArray),
        targetScheduledAt,
        duration ? Number(duration) : 45,
        nowIso,
        nowIso,
      ],
    });

    // 2. Register into youtube_videos table as a scheduled short
    const shortVideoId = `short_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dbVideoId = `${userId}-youtube-${shortVideoId}`;

    try {
      await db.execute({
        sql: `
          INSERT INTO youtube_videos (
            id, user_id, video_id, title, description, thumbnail, views, likes,
            comments, duration, is_short, category, visibility, status, tags,
            scheduled_at, published_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 1, 'Shorts', 'public', 'scheduled', ?, ?, ?, ?)
          ON CONFLICT(user_id, video_id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            status = 'scheduled',
            scheduled_at = excluded.scheduled_at,
            updated_at = excluded.updated_at
        `,
        args: [
          dbVideoId,
          userId,
          shortVideoId,
          finalTitle,
          finalDescription,
          thumbnailUrl || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80",
          duration ? `${duration}s` : "0:45",
          tagArray.join(","),
          targetScheduledAt,
          targetScheduledAt,
          nowIso,
        ],
      });
    } catch (e) {
      console.warn("[AutopilotQueue] youtube_videos registration warning:", e);
    }

    res.status(201).json({
      success: true,
      queueItemId: queueId,
      scheduledAt: targetScheduledAt,
      status: "scheduled",
      title: finalTitle,
      message: "Clip successfully added to Autopilot Queue!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add clip to autopilot queue";
    console.error("[ViralClips Route] POST /autopilot-queue error:", message);
    res.status(500).json({ error: message });
  }
});

export default router;
