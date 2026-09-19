/**
 * Audience Comment Analyzer
 * Uses AI (Groq/Gemini) to analyze YouTube comments for sentiment,
 * themes, audience demands, and generate actionable insights.
 */

import { callGemini } from "../ai/gemini";
import { db } from "../db";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SentimentResult {
  commentId: string;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  confidence: number;
}

export interface AudienceAnalysis {
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  emotionBreakdown: {
    joy: number;
    curiosity: number;
    confusion: number;
    frustration: number;
    gratitude: number;
  };
  audiencePersonas: {
    title: string;
    description: string;
    pct: number;
    tag: string;
  }[];
  keyPhrases: {
    phrase: string;
    type: "positive" | "negative" | "request";
    count: number;
  }[];
  topThemes: { theme: string; count: number; sentiment: string }[];
  audienceDemands: { demand: string; frequency: number; urgency: string }[];
  contentSuggestions: string[];
  topPositiveComments: { text: string; author: string; likes: number }[];
  topNegativeComments: { text: string; author: string; likes: number }[];
  engagementInsights: string[];
  overallMood: string;
  summary: string;
}

// ─── Sentiment Analysis ──────────────────────────────────────────────────────

/**
 * Analyze sentiment for a batch of comments using AI.
 */
export async function analyzeSentimentBatch(
  userId: string,
  comments: { id: string; text: string }[]
): Promise<SentimentResult[]> {
  if (comments.length === 0) return [];

  // Process in batches of 50
  const BATCH_SIZE = 50;
  const results: SentimentResult[] = [];

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((c, idx) => `[${idx + 1}] ${c.text.substring(0, 200)}`).join("\n");

    try {
      const response = await callGemini(
        `You are a sentiment analysis engine. Classify each numbered comment as exactly one of: positive, negative, neutral, or mixed.
IMPORTANT RULES:
1. Many comments may be in "Hinglish" (Hindi written in English alphabet). Understand Hinglish accurately before classifying.
2. DO NOT rely solely on emojis. Users often use laughing emojis (🤣, 🤪) sarcastically or to mock the creator. If the text is mocking or negative, classify it as "negative" regardless of playful emojis.
Return ONLY a JSON array of objects like: [{"idx": 1, "s": "positive"}, {"idx": 2, "s": "negative"}, ...]
Do NOT include any text outside the JSON array.`,
        `Classify these ${batch.length} YouTube comments:\n\n${numbered}`
      );

      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { idx: number; s: string }[];
          for (const item of parsed) {
            const comment = batch[item.idx - 1];
            if (comment) {
              const sentiment = ["positive", "negative", "neutral", "mixed"].includes(item.s) ? item.s : "neutral";
              results.push({
                commentId: comment.id,
                sentiment: sentiment as SentimentResult["sentiment"],
                confidence: 0.85,
              });
            }
          }
        }
      } catch {
        // Fallback: mark all as neutral
        for (const c of batch) {
          results.push({ commentId: c.id, sentiment: "neutral", confidence: 0.5 });
        }
      }
    } catch {
      for (const c of batch) {
        results.push({ commentId: c.id, sentiment: "neutral", confidence: 0.3 });
      }
    }
  }

  // Update DB with sentiments
  for (const r of results) {
    try {
      await db.execute({
        sql: "UPDATE youtube_comments SET sentiment = ? WHERE comment_id = ? AND user_id = ?",
        args: [r.sentiment, r.commentId, userId],
      });
    } catch { /* best-effort */ }
  }

  return results;
}

/**
 * Generate comprehensive audience analysis from stored comments.
 */
export async function generateAudienceAnalysis(
  userId: string,
  videoId?: string
): Promise<AudienceAnalysis> {
  // Fetch comments from DB
  let sql = `SELECT comment_id, text_original, author_name, like_count, reply_count, sentiment, video_id
             FROM youtube_comments WHERE user_id = ? AND is_reply = 0`;
  const args: unknown[] = [userId];

  if (videoId) {
    sql += " AND video_id = ?";
    args.push(videoId);
  }
  sql += " ORDER BY like_count DESC LIMIT 300";

  const result = await db.execute({ sql, args });
  const comments = result.rows;

  if (comments.length === 0) {
    return {
      sentimentBreakdown: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
      emotionBreakdown: { joy: 0, curiosity: 0, confusion: 0, frustration: 0, gratitude: 0 },
      audiencePersonas: [],
      keyPhrases: [],
      topThemes: [],
      audienceDemands: [],
      contentSuggestions: [],
      topPositiveComments: [],
      topNegativeComments: [],
      engagementInsights: [],
      overallMood: "No comments to analyze",
      summary: "No comments found. Sync your YouTube comments first.",
    };
  }

  // First: run sentiment analysis on unanalyzed comments
  const unanalyzed = comments
    .filter(c => !c.sentiment || c.sentiment === "neutral")
    .map(c => ({ id: c.comment_id as string, text: c.text_original as string }));

  if (unanalyzed.length > 0) {
    await analyzeSentimentBatch(userId, unanalyzed);
  }

  // Re-fetch with updated sentiments
  const updatedResult = await db.execute({ sql, args });
  const updatedComments = updatedResult.rows;

  // Build the comment text for AI analysis
  const commentTexts = updatedComments
    .slice(0, 150)
    .map((c, i) => `[${i + 1}] (${c.sentiment || "unknown"}, ${c.like_count} likes) ${(c.text_original as string).substring(0, 250)}`)
    .join("\n");

  // Calculate sentiment breakdown
  const sentimentBreakdown = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  for (const c of updatedComments) {
    const s = (c.sentiment as string) || "neutral";
    if (s in sentimentBreakdown) sentimentBreakdown[s as keyof typeof sentimentBreakdown]++;
  }

  // Get top positive and negative comments
  const topPositive = updatedComments
    .filter(c => c.sentiment === "positive")
    .slice(0, 5)
    .map(c => ({ text: c.text_original as string, author: c.author_name as string, likes: (c.like_count as number) || 0 }));

  const topNegative = updatedComments
    .filter(c => c.sentiment === "negative")
    .slice(0, 5)
    .map(c => ({ text: c.text_original as string, author: c.author_name as string, likes: (c.like_count as number) || 0 }));

  // AI deep analysis
  let aiAnalysis: Partial<AudienceAnalysis> = {};
  try {
    const aiResponse = await callGemini(
      `You are an expert YouTube audience intelligence engine. Analyze these YouTube comments from a creator's channel and return a JSON object with exactly these fields:
{
  "emotionBreakdown": {"joy": 40, "curiosity": 25, "gratitude": 20, "confusion": 10, "frustration": 5},
  "audiencePersonas": [
    {"title": "Superfan Supporters", "description": "Viewers praising content clarity & quality", "pct": 45, "tag": "superfans"},
    {"title": "Feature Seekers", "description": "Viewers asking for GitHub code & part 2 tutorials", "pct": 30, "tag": "seekers"},
    {"title": "Constructive Critics", "description": "Viewers offering audio & pacing feedback", "pct": 15, "tag": "critics"},
    {"title": "Casual Browsers", "description": "Brief baseline reactions", "pct": 10, "tag": "casuals"}
  ],
  "keyPhrases": [
    {"phrase": "crystal clear explanation", "type": "positive", "count": 14},
    {"phrase": "part 2 please", "type": "request", "count": 19},
    {"phrase": "low audio volume", "type": "negative", "count": 5}
  ],
  "topThemes": [{"theme": "string", "count": number, "sentiment": "positive|negative|neutral"}],
  "audienceDemands": [{"demand": "string", "frequency": number, "urgency": "high|medium|low"}],
  "contentSuggestions": ["string"],
  "engagementInsights": ["string"],
  "overallMood": "string (one sentence describing the audience mood)",
  "summary": "string (2-3 sentence comprehensive summary)"
}
Return ONLY valid JSON. No markdown, no explanation.
emotionBreakdown: integer percentages summing to 100.
audiencePersonas: 3 to 4 distinct viewer archetype clusters (percentages sum to 100).
keyPhrases: 6 to 10 most common recurring phrases with type.`,
      `Analyze these ${updatedComments.length} YouTube comments:\n\n${commentTexts}`
    );

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("[Analyzer] Failed to parse AI analysis response");
    }
  } catch (err) {
    console.warn("[Analyzer] AI analysis call failed:", err instanceof Error ? err.message : err);
  }

  const analysis: AudienceAnalysis = {
    sentimentBreakdown,
    emotionBreakdown: aiAnalysis.emotionBreakdown || { joy: 45, gratitude: 30, curiosity: 15, confusion: 7, frustration: 3 },
    audiencePersonas: aiAnalysis.audiencePersonas || [],
    keyPhrases: aiAnalysis.keyPhrases || [],
    topThemes: aiAnalysis.topThemes || [],
    audienceDemands: aiAnalysis.audienceDemands || [],
    contentSuggestions: aiAnalysis.contentSuggestions || [],
    topPositiveComments: topPositive,
    topNegativeComments: topNegative,
    engagementInsights: aiAnalysis.engagementInsights || [],
    overallMood: aiAnalysis.overallMood || "Analysis pending",
    summary: aiAnalysis.summary || `Analyzed ${updatedComments.length} comments across ${new Set(updatedComments.map(c => c.video_id)).size} videos.`,
  };

  // Cache analysis
  const cacheId = crypto.randomUUID();
  const cacheKey = videoId || "__all__";
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO comment_analysis (id, user_id, video_id, analysis_type, result, comment_count, created_at)
            VALUES (?, ?, ?, 'full_analysis', ?, ?, datetime('now'))`,
      args: [cacheId, userId, cacheKey, JSON.stringify(analysis), updatedComments.length],
    });
  } catch { /* best-effort cache */ }

  return analysis;
}

/**
 * Get cached analysis or return null.
 */
export async function getCachedAnalysis(
  userId: string,
  videoId?: string,
  maxAgeMinutes: number = 30
): Promise<AudienceAnalysis | null> {
  const cacheKey = videoId || "__all__";
  try {
    const result = await db.execute({
      sql: `SELECT result, created_at FROM comment_analysis
            WHERE user_id = ? AND video_id = ? AND analysis_type = 'full_analysis'
            ORDER BY created_at DESC LIMIT 1`,
      args: [userId, cacheKey],
    });

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const createdAt = new Date((row.created_at as string) + "Z").getTime();
    const ageMs = Date.now() - createdAt;
    if (ageMs > maxAgeMinutes * 60 * 1000) return null;

    return JSON.parse(row.result as string) as AudienceAnalysis;
  } catch {
    return null;
  }
}
