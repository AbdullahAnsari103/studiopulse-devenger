/**
 * Autopilot AI Pipeline — Enhanced
 * Generates optimized metadata for queued videos using Groq vision AI.
 * - Extracts 5 key frames via ffmpeg (with robust Windows support)
 * - Deep visual analysis of every frame
 * - Platform-specific title, description, tags, hashtags
 * - Optimal publish time from channel analytics
 * - Video classification (Short/Long/Reel by aspect ratio + duration)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutopilotAIResult {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  seoScore: number;
  estimatedCTR: string;
  contentSummary: string;
  bestPublishTime: string;
  bestPublishDay: string;
  bestPublishHour: number;
  platformOptimizations: {
    youtube?: { title: string; description: string; hashtags: string[] };
    instagram?: { caption: string; hashtags: string[] };
    tiktok?: { caption: string; hashtags: string[] };
    facebook?: { post: string; hashtags: string[] };
  };
  videoType: "short" | "long" | "reel";
  aspectRatio: string;
  durationSeconds: number;
}

export interface VideoFrameData {
  base64: string;
  mimeType: string;
}

// ─── Frame Extraction (Enhanced — 5 key frames, robust Windows) ──────────────

/**
 * Check if ffmpeg is available on the system.
 */
let _ffmpegChecked = false;
let _ffmpegAvailable = false;

async function isFfmpegAvailable(): Promise<boolean> {
  if (_ffmpegChecked) return _ffmpegAvailable;
  try {
    const { execSync } = await import("child_process");
    execSync("ffmpeg -version", { timeout: 5000, stdio: "pipe" });
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
    console.warn("[Autopilot AI] ⚠️ ffmpeg not found. Install ffmpeg for full video analysis. Using filename-based analysis as fallback.");
  }
  _ffmpegChecked = true;
  return _ffmpegAvailable;
}

/**
 * Extract key frames from a video file using ffmpeg.
 * Extracts 5 frames at strategic positions (15%, 30%, 50%, 70%, 85% of duration).
 */
export async function extractVideoFrames(
  videoFilePath: string,
  maxFrames: number = 5
): Promise<{ frames: VideoFrameData[]; durationSeconds: number }> {
  const frames: VideoFrameData[] = [];
  let durationSeconds = 0;

  if (!fs.existsSync(videoFilePath)) {
    console.warn(`[Autopilot AI] Video file not found: ${videoFilePath}`);
    return { frames, durationSeconds };
  }

  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) {
    return { frames, durationSeconds };
  }

  try {
    const { execSync } = await import("child_process");

    // Get video duration via ffprobe
    try {
      const durationOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoFilePath}"`,
        { timeout: 15000, stdio: "pipe" }
      ).toString().trim();
      durationSeconds = Math.round(parseFloat(durationOutput) || 0);
      console.log(`[Autopilot AI] Video duration: ${durationSeconds}s`);
    } catch {
      durationSeconds = 30;
    }

    const tempDir = path.resolve("server/uploads/temp-frames");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Strategic frame positions — covers beginning, middle, end of video
    const dur = durationSeconds > 0 ? durationSeconds : 30;
    const positions = [0.15, 0.30, 0.50, 0.70, 0.85];
    const seekPositions = positions.slice(0, maxFrames).map(p => Math.max(0, Math.floor(dur * p)));

    for (let i = 0; i < seekPositions.length; i++) {
      const uid = crypto.randomUUID().slice(0, 8);
      const framePath = path.join(tempDir, `ap-frame-${uid}-${i}.jpg`);
      try {
        execSync(
          `ffmpeg -y -ss ${seekPositions[i]} -i "${videoFilePath}" -frames:v 1 -q:v 2 -vf "scale=720:-2" "${framePath}"`,
          { timeout: 15000, stdio: "pipe" }
        );
        if (fs.existsSync(framePath)) {
          const imageBuffer = fs.readFileSync(framePath);
          frames.push({
            base64: imageBuffer.toString("base64"),
            mimeType: "image/jpeg",
          });
          try { fs.unlinkSync(framePath); } catch { /* cleanup best-effort */ }
        }
      } catch {
        // Frame extraction failed for this position, skip
      }
    }

    console.log(`[Autopilot AI] Extracted ${frames.length}/${maxFrames} frames from video (${durationSeconds}s)`);
  } catch (err) {
    console.error("[Autopilot AI] Frame extraction error:", err instanceof Error ? err.message : err);
  }

  return { frames, durationSeconds };
}

// ─── Video Classification ────────────────────────────────────────────────────

/**
 * Detect aspect ratio from a video file using ffprobe.
 */
export async function detectAspectRatio(videoFilePath: string): Promise<string> {
  const hasFfmpeg = await isFfmpegAvailable();
  if (!hasFfmpeg) return "16:9";

  try {
    const { execSync } = await import("child_process");
    const output = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoFilePath}"`,
      { timeout: 10000, stdio: "pipe" }
    ).toString().trim();

    const [widthStr, heightStr] = output.split(",");
    const width = parseInt(widthStr) || 1920;
    const height = parseInt(heightStr) || 1080;
    const ratio = width / height;

    if (ratio > 1.5) return "16:9";
    if (ratio < 0.7) return "9:16";
    if (ratio > 0.9 && ratio < 1.1) return "1:1";
    if (ratio >= 0.7 && ratio <= 0.9) return "4:5";
    return `${width}:${height}`;
  } catch {
    return "16:9";
  }
}

/**
 * Classify video type based on duration and aspect ratio.
 */
export function classifyVideoType(
  durationSeconds: number,
  aspectRatio: string
): "short" | "long" | "reel" {
  if (durationSeconds <= 60 && (aspectRatio === "9:16" || aspectRatio === "1:1")) {
    return "reel";
  }
  if (durationSeconds <= 60) {
    return "short";
  }
  return "long";
}

/**
 * Determine the best platform for a video based on its characteristics.
 */
export function classifyPlatform(
  durationSeconds: number,
  aspectRatio: string
): string[] {
  const platforms: string[] = ["youtube"];
  if (aspectRatio === "9:16") platforms.push("instagram", "tiktok");
  if (durationSeconds <= 60) {
    if (!platforms.includes("tiktok")) platforms.push("tiktok");
    if (!platforms.includes("instagram")) platforms.push("instagram");
  }
  if (durationSeconds <= 180) {
    if (!platforms.includes("facebook")) platforms.push("facebook");
  }
  return platforms;
}

// ─── Optimal Publish Time ────────────────────────────────────────────────────

/**
 * Analyze channel analytics to determine the optimal publish time.
 */
export async function getOptimalPublishTime(
  userId: string,
  queueOrder: number = 0,
  maxPerDay: number = 1,
  preferredTime: string = "16:00",
  timezone: string = "UTC"
): Promise<{ scheduledAt: string; dayOfWeek: string; hour: number; reasoning: string }> {
  let bestDay = "Wednesday";
  let bestHour = 16;
  let reasoning = "Default optimal time (Wednesday 4 PM) based on general YouTube audience data.";

  try {
    const analyticsResult = await db.execute({
      sql: `SELECT date, views, impressions, ctr, estimated_revenue
            FROM youtube_analytics
            WHERE user_id = ? AND views > 0
            ORDER BY date DESC LIMIT 90`,
      args: [userId],
    });

    if (analyticsResult.rows.length > 10) {
      const dayPerformance: Record<string, { totalViews: number; totalCTR: number; count: number }> = {};
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      for (const row of analyticsResult.rows) {
        const date = new Date(row.date as string);
        const dayName = dayNames[date.getUTCDay()];
        if (!dayPerformance[dayName]) {
          dayPerformance[dayName] = { totalViews: 0, totalCTR: 0, count: 0 };
        }
        dayPerformance[dayName].totalViews += (row.views as number) || 0;
        dayPerformance[dayName].totalCTR += (row.ctr as number) || 0;
        dayPerformance[dayName].count += 1;
      }

      let bestAvgViews = 0;
      for (const [day, perf] of Object.entries(dayPerformance)) {
        const avgViews = perf.totalViews / perf.count;
        if (avgViews > bestAvgViews) {
          bestAvgViews = avgViews;
          bestDay = day;
        }
      }

      reasoning = `AI-optimized: ${bestDay} has the highest average views (${Math.round(bestAvgViews).toLocaleString()}) based on your last ${analyticsResult.rows.length} days of analytics data.`;
    }

    const videoResult = await db.execute({
      sql: `SELECT published_at, views, ctr, impressions
            FROM youtube_videos
            WHERE user_id = ? AND published_at IS NOT NULL AND views > 0
            ORDER BY views DESC LIMIT 20`,
      args: [userId],
    });

    if (videoResult.rows.length >= 5) {
      const hourCounts: Record<number, number> = {};
      for (const row of videoResult.rows) {
        const pubDate = new Date(row.published_at as string);
        const hour = pubDate.getUTCHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + (row.views as number);
      }

      let bestHourViews = 0;
      for (const [hour, views] of Object.entries(hourCounts)) {
        if (views > bestHourViews) {
          bestHourViews = views;
          bestHour = parseInt(hour);
        }
      }

      reasoning += ` Publish hour ${bestHour}:00 UTC selected based on your top-performing videos' upload times.`;
    }
  } catch (err) {
    console.warn("[Autopilot AI] Analytics query failed, using defaults:", err instanceof Error ? err.message : err);
  }

  const [prefH] = preferredTime.split(":").map(Number);
  if (!isNaN(prefH) && bestHour === 16) {
    bestHour = prefH;
  }

  const now = new Date();
  const startDate = new Date(now);
  startDate.setUTCDate(startDate.getUTCDate() + 1);
  const daysToAdd = Math.floor(queueOrder / maxPerDay);
  startDate.setUTCDate(startDate.getUTCDate() + daysToAdd);
  startDate.setUTCHours(bestHour, 0, 0, 0);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    scheduledAt: startDate.toISOString(),
    dayOfWeek: dayNames[startDate.getUTCDay()],
    hour: bestHour,
    reasoning,
  };
}

// ─── AI Metadata Generation (Enhanced) ───────────────────────────────────────

/**
 * Generate optimized metadata for a video using Groq AI with deep visual analysis.
 * Accepts optional user context and pre-extracted frames (from browser canvas or disk).
 */
export async function generateVideoMetadata(
  videoFilePath: string,
  fileName: string,
  userContext: string = "",
  userId: string,
  itemId?: string,
  inputFrames?: VideoFrameData[]
): Promise<AutopilotAIResult> {
  console.log(`[Autopilot AI] ── Generating metadata for: ${fileName} (${itemId || "no-id"}) ──`);

  let frames: VideoFrameData[] = inputFrames || [];
  let durationSeconds = 0;

  // Step 1: Check for frames on disk if itemId provided and no inputFrames
  if (frames.length === 0 && itemId) {
    const tempDir = path.resolve(`server/uploads/temp-frames/${itemId}`);
    if (fs.existsSync(tempDir)) {
      try {
        const frameFiles = fs.readdirSync(tempDir).filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
        for (const file of frameFiles) {
          const buf = fs.readFileSync(path.join(tempDir, file));
          frames.push({ base64: buf.toString("base64"), mimeType: "image/jpeg" });
        }
        if (frames.length > 0) {
          console.log(`[Autopilot AI] Loaded ${frames.length} pre-extracted browser frames from disk for ${itemId}`);
        }
      } catch { /* best-effort load */ }
    }
  }

  // Fallback to server ffmpeg extraction if still no frames
  if (frames.length === 0) {
    const extracted = await extractVideoFrames(videoFilePath, 5);
    frames = extracted.frames;
    durationSeconds = extracted.durationSeconds;
  }

  console.log(`[Autopilot AI] Total frames for analysis: ${frames.length}, Duration: ${durationSeconds}s`);

  // Step 2: Detect aspect ratio
  const aspectRatio = await detectAspectRatio(videoFilePath);

  // Step 3: Classify video type
  const videoType = classifyVideoType(durationSeconds, aspectRatio);

  // Step 4: Build enhanced AI prompt — Visual visual visual priority!
  const systemPrompt = `You are Studio AI Autopilot, the world's leading video content intelligence system.
You MUST deeply analyze every video frame provided and generate ORIGINAL, HIGH-CONVERTING, PUBLISH-READY metadata.

CRITICAL VISUAL ANALYSIS RULES:
1. VISUAL FRAMES ARE THE #1 SOURCE OF TRUTH. Analyze what you see in EACH image: actions, people, objects, environment, clothing, text overlays, colors, lighting, style.
2. User context (e.g. "music video", "vlog", "tech tutorial") is ONLY a broad genre hint. NEVER generate generic filler repeating the user context. Focus 100% on the SPECIFIC content visible in the frames!
3. Generate a COMPLETELY ORIGINAL, CLICK-WORTHY title reflecting the actual visual content.
4. Write a COMPREHENSIVE YouTube description (800-1500 chars) detailing what happens in the video, key takeaways, CTAs, and 5 hashtags. Use line breaks.
5. Generate 15-25 HIGHLY SPECIFIC tags based on visual observations.
6. Return ONLY pure raw JSON. No markdown fences, no backticks.

CATEGORY ID REFERENCE:
1=Film & Animation, 2=Autos & Vehicles, 10=Music, 15=Pets & Animals, 17=Sports, 19=Travel & Events,
20=Gaming, 22=People & Blogs, 23=Comedy, 24=Entertainment, 25=News & Politics, 26=Howto & Style,
27=Education, 28=Science & Technology`;

  const hasFrames = frames.length > 0;
  const frameDescription = hasFrames
    ? `\n\n🎬 ${frames.length} KEY FRAMES from the actual video are attached. You MUST visually analyze EACH frame and describe what you see before generating metadata.`
    : `\n\n⚠️ No frames available (ffmpeg not installed). Generate the best possible metadata based on the filename and user context.`;

  const userPrompt = `GENERATE PUBLISH-READY METADATA for this video.

VIDEO INFORMATION:
- File Name: "${fileName}"
- Duration: ${durationSeconds} seconds (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)
- Aspect Ratio: ${aspectRatio}
- Video Type: ${videoType} ${videoType === "short" || videoType === "reel" ? "(YouTube Shorts / Reels format)" : "(Standard YouTube video)"}
${userContext ? `\n📝 USER CONTEXT (PRIMARY GUIDE — this is what the creator says the video is about):\n"${userContext}"` : ""}${frameDescription}

YOUR TASK: Return a JSON object with these EXACT fields:
{
  "title": "Original, click-worthy title based on video content (max 100 chars). Must be compelling and unique.",
  "description": "Comprehensive YouTube description (800-1500 chars). Include: hook, summary, keywords, CTA, hashtags. Use line breaks for readability.",
  "tags": ["tag1", "tag2", ... 15-25 highly relevant tags based on video content],
  "categoryId": "YouTube category ID as string (see reference above)",
  "seoScore": 85,
  "estimatedCTR": "6.5%",
  "contentSummary": "Detailed 3-5 sentence description of the video's content, topics, and visual style based on frame analysis.",
  "platformOptimizations": {
    "youtube": {
      "title": "YouTube-specific SEO title (max 100 chars, different from main title if possible)",
      "description": "Full YouTube description with keywords, sections, CTA, and 5 hashtags",
      "hashtags": ["hashtag1", "hashtag2", ... up to 15 relevant hashtags]
    },
    "instagram": {
      "caption": "Instagram Reels caption with hook, emojis, story, and CTA (500-1000 chars)",
      "hashtags": ["hashtag1", "hashtag2", ... up to 30 hashtags including niche + broad]
    },
    "tiktok": {
      "caption": "TikTok caption: short, punchy hook with emoji (max 150 chars)",
      "hashtags": ["hashtag1", "hashtag2", ... up to 10 viral-potential hashtags]
    },
    "facebook": {
      "post": "Facebook post: conversational, engaging, includes question for comments (300-500 chars)",
      "hashtags": ["hashtag1", "hashtag2", ... up to 10]
    }
  }
}

Return ONLY the raw JSON object.`;

  // Step 5: Call AI with frames
  let parsed: Record<string, unknown>;
  try {
    let rawResponse: string;
    if (hasFrames) {
      const { callGeminiWithImages } = await import("../ai/gemini");
      console.log(`[Autopilot AI] Sending ${frames.length} frames to Groq Vision AI for deep analysis...`);
      rawResponse = await callGeminiWithImages(systemPrompt, userPrompt, frames);
    } else {
      const { callGemini } = await import("../ai/gemini");
      console.log(`[Autopilot AI] No frames available, generating from filename + context...`);
      rawResponse = await callGemini(systemPrompt, userPrompt);
    }

    // Clean response
    let jsonStr = rawResponse.trim();
    // Remove markdown code fences if present
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    // Remove any leading/trailing non-JSON characters
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    parsed = JSON.parse(jsonStr);
    console.log(`[Autopilot AI] ✅ AI generated metadata: "${(parsed.title as string || "").substring(0, 60)}..."`);
  } catch (err) {
    console.warn("[Autopilot AI] AI generation failed, using intelligent fallback:", err instanceof Error ? err.message : err);

    // Enhanced smart fallback
    const cleanName = fileName
      .replace(/\.[^/.]+$/, "")  // Remove extension
      .replace(/[-_]+/g, " ")   // Replace dashes/underscores with spaces
      .replace(/\b\d{4}[-]\d{2}[-]\d{2}\b/g, "") // Remove dates like 2026-02-28
      .replace(/\b\d{6}\b/g, "") // Remove timestamps
      .replace(/recording/i, "") // Remove "Recording"
      .replace(/\s+/g, " ")     // Normalize whitespace
      .trim();

    const words = cleanName.split(/\s+/).filter(w => w.length > 2);
    const mainTopic = userContext || cleanName || "Video Content";
    const primaryKeyword = words[0] || "Video";

    parsed = {
      title: userContext
        ? `${userContext.substring(0, 80)} | Must Watch`
        : `${cleanName || "Amazing Content"} — Complete Guide (${new Date().getFullYear()})`,
      description: `${mainTopic}\n\nIn this video, discover everything about ${mainTopic.toLowerCase()}. Whether you're a beginner or experienced, this content will provide valuable insights and practical tips.\n\n🔔 Subscribe and turn on notifications so you never miss new content!\n👍 Like this video if you found it helpful\n💬 Drop a comment below with your thoughts\n\n#${primaryKeyword.replace(/\s/g, "")} #Content #Trending #MustWatch #Viral`,
      tags: [
        primaryKeyword.toLowerCase(), "tutorial", "guide", "tips", "trending",
        "viral", "mustwatch", "howto", "learn", "education",
        ...words.slice(0, 10).map(w => w.toLowerCase()),
      ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 25),
      categoryId: "22",
      seoScore: 70,
      estimatedCTR: "3.5%",
      contentSummary: `This video covers ${mainTopic}. The content provides insights and information for viewers interested in this topic.`,
      platformOptimizations: {
        youtube: {
          title: userContext ? userContext.substring(0, 90) : cleanName,
          description: `${mainTopic}\n\n🔔 Subscribe for more!\n\n#${primaryKeyword.replace(/\s/g, "")} #Trending`,
          hashtags: [primaryKeyword.replace(/\s/g, ""), "Trending", "MustWatch"],
        },
        instagram: {
          caption: `🎬 ${mainTopic}\n\nWatch the full video and let me know what you think! 👇\n\n.`,
          hashtags: [primaryKeyword.replace(/\s/g, ""), "reels", "viral", "trending", "explore", "instagood"],
        },
        tiktok: {
          caption: `${mainTopic.substring(0, 100)} 🔥`,
          hashtags: [primaryKeyword.replace(/\s/g, ""), "fyp", "viral", "trending"],
        },
        facebook: {
          post: `${mainTopic}\n\nWhat do you think about this? Share your thoughts in the comments! 👇`,
          hashtags: [primaryKeyword.replace(/\s/g, ""), "viral", "trending"],
        },
      },
    };
  }

  // Step 6: Get optimal publish time
  const publishTimeResult = await getOptimalPublishTime(userId);

  return {
    title: (parsed.title as string) || fileName,
    description: (parsed.description as string) || "",
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
    categoryId: (parsed.categoryId as string) || "22",
    seoScore: (parsed.seoScore as number) || 75,
    estimatedCTR: (parsed.estimatedCTR as string) || "4.5%",
    contentSummary: (parsed.contentSummary as string) || "",
    bestPublishTime: publishTimeResult.scheduledAt,
    bestPublishDay: publishTimeResult.dayOfWeek,
    bestPublishHour: publishTimeResult.hour,
    platformOptimizations: (parsed.platformOptimizations as AutopilotAIResult["platformOptimizations"]) || {},
    videoType,
    aspectRatio,
    durationSeconds,
  };
}
