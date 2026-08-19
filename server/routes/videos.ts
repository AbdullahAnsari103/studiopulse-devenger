/**
 * My Videos Router — Central video management endpoints.
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { getPlatformAdapter } from "../integrations/adapters";
import { callGemini } from "../ai/gemini";
import { db } from "../db";

const router = Router();

// ─── GET /api/videos ─────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const platform = (req.query.platform as string) || "youtube";
    const adapter = getPlatformAdapter(platform);

    const result = await adapter.getVideos(userId, {
      status: req.query.status as string,
      search: req.query.search as string,
      category: req.query.category as string,
      visibility: req.query.visibility as string,
      dateRange: req.query.dateRange as string,
      sortBy: req.query.sortBy as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    console.error("[Videos Route] GET /api/videos error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── GET /api/videos/summary ──────────────────────────────────────────────────

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const platform = (req.query.platform as string) || "youtube";
    const adapter = getPlatformAdapter(platform);
    const summary = await adapter.getSummaryStats(userId);

    res.json(summary);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch summary stats";
    console.error("[Videos Route] GET /api/videos/summary error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── GET /api/videos/:videoId/analytics ────────────────────────────────────────

router.get("/:videoId/analytics", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const { videoId } = req.params;
    if (!userId || !videoId) {
      res.status(400).json({ error: "userId and videoId are required" });
      return;
    }

    const platform = (req.query.platform as string) || "youtube";
    const adapter = getPlatformAdapter(platform);
    const analytics = await adapter.getVideoAnalytics(userId, videoId);

    res.json(analytics);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch video analytics";
    console.error("[Videos Route] GET /api/videos/:videoId/analytics error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── PATCH /api/videos/:videoId ───────────────────────────────────────────────

router.patch("/:videoId", async (req: Request, res: Response) => {
  try {
    const { userId, platform = "youtube", ...payload } = req.body;
    const { videoId } = req.params;

    if (!userId || !videoId) {
      res.status(400).json({ error: "userId and videoId are required" });
      return;
    }

    const adapter = getPlatformAdapter(platform);
    const result = await adapter.updateVideo(userId, videoId, payload);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update video";
    console.error("[Videos Route] PATCH /api/videos/:videoId error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── DELETE /api/videos/:videoId ──────────────────────────────────────────────

router.delete("/:videoId", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || req.body.userId;
    const platform = (req.query.platform as string) || req.body.platform || "youtube";
    const { videoId } = req.params;

    if (!userId || !videoId) {
      res.status(400).json({ error: "userId and videoId are required" });
      return;
    }

    const adapter = getPlatformAdapter(platform);
    const result = await adapter.deleteVideo(userId, videoId);

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete video";
    console.error("[Videos Route] DELETE /api/videos/:videoId error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/videos/bulk ────────────────────────────────────────────────────

router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { userId, platform = "youtube", action, videoIds, payload } = req.body;

    if (!userId || !Array.isArray(videoIds) || videoIds.length === 0) {
      res.status(400).json({ error: "userId and videoIds array are required" });
      return;
    }

    const adapter = getPlatformAdapter(platform);
    const results: any[] = [];

    for (const vId of videoIds) {
      try {
        if (action === "delete") {
          const resDel = await adapter.deleteVideo(userId, vId);
          results.push({ videoId: vId, success: true, action: "delete" });
        } else if (action === "updateVisibility") {
          await adapter.changeVisibility(userId, vId, payload.visibility);
          results.push({ videoId: vId, success: true, action: "updateVisibility" });
        } else if (action === "updateCategory") {
          await adapter.updateVideo(userId, vId, { category: payload.category });
          results.push({ videoId: vId, success: true, action: "updateCategory" });
        }
      } catch (err) {
        results.push({ videoId: vId, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    res.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bulk operation failed";
    console.error("[Videos Route] POST /api/videos/bulk error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/videos/:videoId/ai-diagnose ────────────────────────────────────

router.post("/:videoId/ai-diagnose", async (req: Request, res: Response) => {
  try {
    const { userId, platform = "youtube" } = req.body;
    const { videoId } = req.params;

    if (!userId || !videoId) {
      res.status(400).json({ error: "userId and videoId are required" });
      return;
    }

    const adapter = getPlatformAdapter(platform);
    const video = await adapter.getVideoDetails(userId, videoId);
    if (!video) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    // Compute basic engagement metrics for context
    const engagementRate = video.views > 0 ? ((video.likes + video.comments) / video.views * 100).toFixed(2) : "0";
    const titleLength = video.title?.length || 0;
    const descLength = video.description?.length || 0;
    const tagCount = video.tags?.length || 0;

    const systemPrompt = `You are Studio AI — an elite YouTube growth strategist and SEO specialist. 
You analyze videos with surgical precision, identify every underperformance cause, and prescribe actionable fixes.
You always respond with valid JSON only, no markdown, no explanation outside the JSON.`;

    const userPrompt = `Diagnose this YouTube video's performance:

Title: ${video.title}
Description (first 500 chars): ${(video.description || "").slice(0, 500)}
Views: ${video.views}
Likes: ${video.likes}
Comments: ${video.comments}
Tags: ${(video.tags || []).join(", ")}
Category: ${video.category || "Unknown"}
Visibility: ${video.visibility || "public"}
Title Length: ${titleLength} characters
Description Length: ${descLength} characters
Tag Count: ${tagCount}
Engagement Rate: ${engagementRate}%

Analyze deeply and return ONLY valid JSON in this exact format:
{
  "overallScore": <integer 0-100, based on SEO completeness, engagement rate, title quality>,
  "seoGrade": "<letter grade like A, B+, C-, D>",
  "performanceLabel": "<one of: Underperforming | Below Average | Average | Strong | Viral>",
  "summary": "<2-sentence executive summary of performance>",
  "whyUnderperforming": "<3-5 sentences explaining the root causes of underperformance. Be specific.>",
  "issues": [
    {
      "type": "<critical|warning|info>",
      "field": "<title|description|tags|visibility|timing|seo|general>",
      "title": "<short issue name>",
      "detail": "<1-2 sentences explaining what's wrong>",
      "impact": "<specific metric impact, e.g. '15-30% lower CTR'>",
      "fix": "<exact actionable fix>"
    }
  ],
  "suggestedTitle": "<optimized title, max 70 chars, compelling hook + keywords>",
  "suggestedDescription": "<optimized description, 150-200 words, includes keywords, call-to-action, relevant hashtags>",
  "suggestedTags": ["<tag1>", "<tag2>", "<tag3>", "...up to 15 relevant tags"],
  "recommendedTime": "<specific day+time, e.g. 'Saturday at 6:00 PM EST'>",
  "quickWins": [
    "<specific actionable improvement #1>",
    "<specific actionable improvement #2>",
    "<specific actionable improvement #3>"
  ],
  "applyPayload": {
    "title": "<same as suggestedTitle>",
    "description": "<same as suggestedDescription>",
    "tags": ["<same as suggestedTags>"]
  }
}`;

    const text = await callGemini(systemPrompt, userPrompt);
    
    let diagnosis;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      diagnosis = JSON.parse(cleaned);
    } catch {
      // Fallback structured response if parsing fails
      diagnosis = {
        overallScore: 42,
        seoGrade: "C",
        performanceLabel: "Underperforming",
        summary: "This video has untapped potential. Optimizing the title, tags, and description can significantly boost discovery.",
        whyUnderperforming: `With only ${video.views} views and ${engagementRate}% engagement, the video is not reaching its potential audience. The title may lack keyword optimization and the tags appear insufficient to trigger YouTube's recommendation algorithm. Publishing at optimal times and improving the thumbnail click-through rate would help considerably.`,
        issues: [
          {
            type: titleLength < 50 ? "critical" : titleLength > 70 ? "warning" : "info",
            field: "title",
            title: "Title needs optimization",
            detail: `Current title is ${titleLength} characters. Optimal titles are 50-65 characters with front-loaded keywords.`,
            impact: "Up to 25% lower CTR",
            fix: "Rewrite with primary keyword in first 3 words. Add numbers or power words."
          },
          {
            type: tagCount < 5 ? "critical" : tagCount < 10 ? "warning" : "info",
            field: "tags",
            title: "Insufficient tags",
            detail: `Only ${tagCount} tags detected. YouTube uses tags to categorize and recommend videos.`,
            impact: "30% fewer recommended impressions",
            fix: "Add 10-15 tags mixing broad, medium, and long-tail keywords."
          },
          {
            type: descLength < 200 ? "critical" : "warning",
            field: "description",
            title: "Description needs work",
            detail: `Description is ${descLength} characters. Aim for 300-500 words with natural keyword inclusion.`,
            impact: "Lower search ranking",
            fix: "Add timestamps, relevant keywords naturally, and a strong call-to-action."
          }
        ],
        suggestedTitle: `${video.title} | ${new Date().getFullYear()} Complete Guide`,
        suggestedDescription: `${video.title}\n\n${video.description || "In this video, we cover everything you need to know."}\n\n📌 Like and Subscribe for more!\n\n#YouTube #Creator #${video.category || "Education"}`,
        suggestedTags: [...(video.tags || []), "youtube", "tutorial", "2024", video.category || "education", "howto", "tips"].slice(0, 15),
        recommendedTime: "Saturday at 6:00 PM EST",
        quickWins: [
          "Add a custom thumbnail with bold text overlay",
          "Pin a comment with key timestamps and links",
          "Create a short (Reel/Short) teaser to drive traffic to this video"
        ],
        applyPayload: {
          title: `${video.title} | ${new Date().getFullYear()} Complete Guide`,
          description: `${video.description || ""}\n\n📌 Like & Subscribe!\n#YouTube #Creator`,
          tags: [...(video.tags || []), "youtube", "tips", "tutorial"].slice(0, 15),
        }
      };
    }

    res.json(diagnosis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI diagnosis failed";
    console.error("[Videos Route] AI diagnose error:", message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/videos/:videoId/ai-apply ──────────────────────────────────────
// Applies AI-suggested fixes (title, description, tags) to the video on YouTube.

router.post("/:videoId/ai-apply", async (req: Request, res: Response) => {
  try {
    const { userId, platform = "youtube", title, description, tags } = req.body;
    const { videoId } = req.params;

    if (!userId || !videoId) {
      res.status(400).json({ error: "userId and videoId are required" });
      return;
    }

    if (!title && !description && !tags) {
      res.status(400).json({ error: "At least one of title, description, or tags is required" });
      return;
    }

    const adapter = getPlatformAdapter(platform);
    const payload: { title?: string; description?: string; tags?: string[] } = {};
    if (title) payload.title = title;
    if (description) payload.description = description;
    if (Array.isArray(tags) && tags.length > 0) payload.tags = tags;

    const result = await adapter.updateVideo(userId, videoId, payload);
    console.log(`[Videos Route] AI fixes applied to video ${videoId}:`, Object.keys(payload));

    res.json({ success: true, video: result.video, applied: Object.keys(payload) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to apply AI fixes";
    console.error("[Videos Route] AI apply error:", message);
    res.status(500).json({ error: message });
  }
});

export default router;
