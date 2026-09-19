/**
 * Audience Analysis Routes
 * Endpoints for syncing comments, getting comment list, AI audience analysis,
 * AI reply generation, direct YouTube comment posting, and auto-reply settings.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import {
  fetchAllComments,
  fetchVideoComments,
  getStoredComments,
  getCommentStats,
} from "../integrations/youtube/comments";
import {
  generateAudienceAnalysis,
  getCachedAnalysis,
} from "../audience/analyzer";
import {
  getCreatorReplySettings,
  saveCreatorReplySettings,
  generateAIReply,
  replyToComment,
  runAutoReply,
  deleteReplyFromYouTube,
  editReplyOnYouTube,
} from "../audience/comment-replier";
import {
  getCreatorToneProfile,
  updateCreatorToneProfile,
  generateToneComparison,
} from "../audience/tone-analyzer";

import { db } from "../db";

const router = Router();

/**
 * GET /api/audience/videos
 * Returns all user YouTube videos with comment counts for per-video filtering.
 */
router.get("/videos", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const result = await db.execute({
      sql: `SELECT v.video_id, v.title, v.thumbnail, v.views, v.likes, v.comments as yt_comments,
                   (SELECT COUNT(*) FROM youtube_comments c WHERE c.video_id = v.video_id AND c.user_id = v.user_id AND c.is_reply = 0) as db_comments
            FROM youtube_videos v WHERE v.user_id = ? ORDER BY v.published_at DESC`,
      args: [userId],
    });

    const videos = result.rows.map(r => {
      // Ensure thumbnail uses mqdefault which is available for all videos and YouTube Shorts
      let thumb = (r.thumbnail as string) || "";
      if (thumb.includes("hqdefault")) thumb = thumb.replace("hqdefault", "mqdefault");
      return {
        videoId: r.video_id as string,
        title: r.title as string,
        thumbnail: thumb,
        views: Number(r.views || 0),
        likes: Number(r.likes || 0),
        ytComments: Number(r.yt_comments || 0),
        dbComments: Number(r.db_comments || 0),
      };
    });

    res.json({ videos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audience/comments
 * Returns stored comments for a user, optionally filtered by videoId or sentiment.
 */
router.get("/comments", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const videoId = req.query.videoId as string | undefined;
    const sentiment = req.query.sentiment as string | undefined;
    const sortBy = (req.query.sortBy as "newest" | "likes" | "replies") || "newest";
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);

    const comments = await getStoredComments(userId, {
      videoId,
      sentiment,
      sortBy,
      limit,
      offset,
    });

    const stats = await getCommentStats(userId, videoId);

    res.json({
      comments,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audience/analysis
 * Returns cached or newly generated AI audience analysis.
 */
router.get("/analysis", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const videoId = req.query.videoId as string | undefined;
    const forceRefresh = req.query.refresh === "true";

    if (!forceRefresh) {
      const cached = await getCachedAnalysis(userId, videoId);
      if (cached) {
        res.json({ analysis: cached, cached: true });
        return;
      }
    }

    // Generate fresh analysis
    const analysis = await generateAudienceAnalysis(userId, videoId);
    res.json({ analysis, cached: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate audience analysis";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/audience/sync
 * Sync comments from YouTube API for user's videos.
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId as string || req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const videoId = req.body.videoId as string | undefined;

    if (videoId) {
      const count = await fetchVideoComments(userId, videoId);
      // Trigger fresh analysis after sync
      const analysis = await generateAudienceAnalysis(userId, videoId);
      res.json({ success: true, count, analysis });
    } else {
      const result = await fetchAllComments(userId);
      const analysis = await generateAudienceAnalysis(userId);
      res.json({ success: true, ...result, analysis });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync comments";
    res.status(500).json({ error: message });
  }
});

// ─── Reply & Auto-Reply Endpoints ────────────────────────────────────────────

/**
 * POST /api/audience/reply
 * Generate an AI reply for a specific comment and optionally post it to YouTube.
 */
router.post("/reply", async (req: Request, res: Response) => {
  try {
    const { userId, commentDbId, parentCommentId, commentText, authorName, postToYouTube, customReplyText, customInstruction } = req.body;

    if (!userId || !commentText || !authorName) {
      res.status(400).json({ error: "userId, commentText, and authorName are required" });
      return;
    }

    // If only generating (not posting), just return the AI draft
    if (!postToYouTube && !customReplyText) {
      const replyText = await generateAIReply(userId, commentText, authorName, customInstruction);
      res.json({ reply: replyText, postedToYouTube: false });
      return;
    }

    // Full reply flow: generate + optionally post to YouTube
    const result = await replyToComment(
      userId,
      commentDbId || "",
      parentCommentId || "",
      commentText,
      authorName,
      postToYouTube || false,
      customReplyText,
      customInstruction
    );

    res.json({
      reply: result.replyText,
      postedToYouTube: result.postedToYouTube,
      youtubeReplyId: result.youtubeReplyId,
      commentId: result.commentId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate/post reply";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audience/reply-settings
 * Get the creator's auto-reply settings and persona context.
 */
router.get("/reply-settings", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const settings = await getCreatorReplySettings(userId);
    res.json({ settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get reply settings";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/audience/reply-settings
 * Save/update the creator's auto-reply settings and persona context.
 */
router.put("/reply-settings", async (req: Request, res: Response) => {
  try {
    const { userId, ...settings } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const updated = await saveCreatorReplySettings(userId, settings);
    res.json({ settings: updated, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save reply settings";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/audience/auto-reply
 * Manually trigger an auto-reply run for unreplied comments.
 */
router.post("/auto-reply", async (req: Request, res: Response) => {
  try {
    const { userId, videoId, postToYouTube } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const result = await runAutoReply(userId, videoId, postToYouTube || false);
    res.json({
      success: true,
      repliesGenerated: result.repliesGenerated,
      repliesPosted: result.repliesPosted,
      replies: result.replies,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run auto-reply";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/audience/reply
 * Delete a previously posted reply from YouTube and clear local DB tracking.
 */
router.delete("/reply", async (req: Request, res: Response) => {
  try {
    const { userId, youtubeCommentId, commentDbId } = req.body;
    if (!userId || !youtubeCommentId || !commentDbId) {
      res.status(400).json({ error: "userId, youtubeCommentId, and commentDbId are required" });
      return;
    }

    const result = await deleteReplyFromYouTube(userId, youtubeCommentId, commentDbId);
    res.json({ success: true, deleted: result.deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete reply";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/audience/reply/edit
 * Edit/update an existing reply on YouTube.
 */
router.put("/reply/edit", async (req: Request, res: Response) => {
  try {
    const { userId, youtubeCommentId, commentDbId, newText } = req.body;
    if (!userId || !youtubeCommentId || !commentDbId || !newText) {
      res.status(400).json({ error: "userId, youtubeCommentId, commentDbId, and newText are required" });
      return;
    }

    const result = await editReplyOnYouTube(userId, youtubeCommentId, commentDbId, newText);
    res.json({ success: true, updated: result.updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to edit reply";
    res.status(500).json({ error: message });
  }
});

// ─── Tone Profile Endpoints ──────────────────────────────────────────────────

/**
 * GET /api/audience/tone-profile
 * Retrieve the creator's learned voice profile.
 */
router.get("/tone-profile", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const { profile, manualRepliesCount } = await getCreatorToneProfile(userId);
    res.json({
      profile,
      manualRepliesCount,
      message: profile
        ? "Creator voice profile active"
        : `Found ${manualRepliesCount} manual replies. Need at least 3 to auto-build profile.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get tone profile";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/audience/tone-profile/refresh
 * Force re-analyze the creator's voice from their latest replies.
 */
router.post("/tone-profile/refresh", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const { profile, manualRepliesCount } = await getCreatorToneProfile(userId, true);
    if (!profile) {
      res.json({
        profile: null,
        manualRepliesCount,
        message: `Found ${manualRepliesCount} manual replies. Reply to at least 3 comments manually or customize your tone below to build your voice profile.`,
      });
      return;
    }

    res.json({
      profile,
      manualRepliesCount,
      message: "Voice profile successfully calibrated from your latest replies.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to refresh tone profile";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/audience/tone-profile
 * Update or customize the creator's voice profile settings.
 */
router.put("/tone-profile", async (req: Request, res: Response) => {
  try {
    const { userId, ...updates } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const profile = await updateCreatorToneProfile(userId, updates);
    res.json({ profile, message: "Voice profile updated successfully." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update tone profile";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/audience/tone-profile/test
 * Generate side-by-side comparison: generic chatbot vs cloned creator voice.
 */
router.post("/tone-profile/test", async (req: Request, res: Response) => {
  try {
    const { userId, commentText, authorName } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const comment = commentText || "Loved the video! What camera and editing software do you use for your shots?";
    const author = authorName || "DevFan";

    const comparison = await generateToneComparison(userId, comment, author);
    res.json(comparison);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to test tone comparison";
    res.status(500).json({ error: message });
  }
});

export default router;
