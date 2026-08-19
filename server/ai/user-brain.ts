/**
 * User AI Brain Module — Personalized memory and analytics footprint store.
 *
 * Compiles and persists user channel metrics, performance footprint, top content
 * patterns, and custom memory notes so the assistant has grounded, current
 * context about the user's channel for system-prompt injection.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE WIRING UP A 5-SECOND POLL LOOP
 * ─────────────────────────────────────────────────────────────────────────
 * This module reads from local tables (youtube_channels, youtube_videos,
 * youtube_analytics) that a separate ingestion process keeps in sync with the
 * YouTube API. It does NOT call the YouTube API directly, and nothing that
 * feeds it should poll YouTube every 5 seconds:
 *
 *   - YouTube Data API v3's default quota is 10,000 units/day, and that
 *     quota is per Google Cloud PROJECT — i.e. shared across every user of
 *     your app, not granted fresh per user. Even a cheap 1-unit read polled
 *     every 5s is 17,280 calls/day for a single user — more than your app's
 *     entire daily budget, gone on one person.
 *   - YouTube's own analytics (views, watch time, revenue) aren't real-time
 *     on their side either. They're delayed by hours and can take up to
 *     ~48h to finalize. Polling faster than the underlying data changes
 *     just spends quota to fetch identical numbers.
 *   - New-upload events ARE available for free, in near-real-time, via
 *     YouTube's PubSubHubbub/WebSub push feed — no polling required.
 *
 * See `youtube-ingestion.ts` for the ingestion strategy: push notifications
 * for "something changed," a quota-budgeted background poller for slower-moving
 * analytics, and a cooldown-guarded on-demand refresh for dashboard opens.
 */

import { randomUUID } from "node:crypto";
import { db } from "../db";

const MAX_LEARNING_LOG_PER_USER = 200; // hard cap so the table (and prompt payload) can't grow forever
const MAX_ACTIVITY_LINES = 15;
const MAX_PROMPT_CHARS = 6000; // rough ceiling on what we inject into the system prompt

function nFix(val: number | null | undefined, digits: number = 2): string {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toFixed(digits);
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface UserBrainData {
  userId: string;
  hasYouTube: boolean;
  channelTitle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  avgCtr: number;
  avgRetention: number | null; // null = not available yet; never a fabricated placeholder
  watchTime30d: number;
  revenue30d: number;
  topVideosSummary: string[];
  recentUploadsSummary: string[];
  contentInsights: string;
  customMemories: string[];
  updatedAt: string;
}

// In-process dedupe lock so concurrent requests for the same user don't
// each kick off their own sync.
const inFlightSyncs = new Map<string, Promise<UserBrainData>>();

/**
 * Checks live connection status directly from connected_platforms, rather
 * than inferring it from stored brain fields. Cheap, indexed lookup — and
 * it's the only source of truth that can't drift out of sync.
 */
async function checkHasYouTube(userId: string): Promise<boolean> {
  const connRes = await db.execute({
    sql: "SELECT 1 FROM connected_platforms WHERE user_id = ? AND platform = 'youtube' AND is_connected = 1 LIMIT 1",
    args: [userId],
  });
  return connRes.rows.length > 0;
}

/**
 * Compiles real-time channel performance data into a rich AI Brain summary.
 * Safe to call concurrently for the same user — duplicate calls join the
 * in-flight sync instead of triggering redundant DB/API work.
 */
export async function syncUserBrain(userId: string): Promise<UserBrainData> {
  const existing = inFlightSyncs.get(userId);
  if (existing) return existing;

  const syncPromise = doSyncUserBrain(userId).finally(() => {
    inFlightSyncs.delete(userId);
  });
  inFlightSyncs.set(userId, syncPromise);
  return syncPromise;
}

async function doSyncUserBrain(userId: string): Promise<UserBrainData> {
  console.log(`[UserBrain] Compiling AI brain for user ${userId}...`);

  const hasYouTube = await checkHasYouTube(userId);
  if (!hasYouTube) {
    return {
      userId,
      hasYouTube: false,
      channelTitle: "",
      subscribers: 0,
      totalViews: 0,
      videoCount: 0,
      avgCtr: 0,
      avgRetention: null,
      watchTime30d: 0,
      revenue30d: 0,
      topVideosSummary: [],
      recentUploadsSummary: [],
      contentInsights: "YouTube account is not connected yet.",
      customMemories: [],
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    // Snapshot the previous brain row BEFORE overwriting it, so we can
    // compute real deltas instead of inventing "learning."
    const prevRes = await db.execute({
      sql: "SELECT * FROM user_brain WHERE user_id = ?",
      args: [userId],
    });
    const prev = prevRes.rows[0];

    // 1. Fetch Channel Info
    const channelRes = await db.execute({
      sql: "SELECT * FROM youtube_channels WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
      args: [userId],
    });
    const ch = channelRes.rows[0];

    const connRes = await db.execute({
      sql: "SELECT * FROM connected_platforms WHERE user_id = ? AND platform = 'youtube' AND is_connected = 1 LIMIT 1",
      args: [userId],
    });

    const channelTitle =
      (ch?.title as string) || (connRes.rows[0]?.account_name as string) || "Connected YouTube Channel";
    const subscribers = (ch?.subscriber_count as number) || 0;
    const totalViews = (ch?.view_count as number) || 0;
    const videoCount = (ch?.video_count as number) || 0;

    // 2. Fetch Top Performing Videos (with fallback to generic videos table)
    const topVideosRes = await db.execute({
      sql: "SELECT * FROM youtube_videos WHERE user_id = ? ORDER BY views DESC LIMIT 10",
      args: [userId],
    });
    let videosList = topVideosRes.rows;
    if (videosList.length === 0) {
      const fallbackVideosRes = await db.execute({
        sql: "SELECT * FROM videos WHERE user_id = ? AND platform = 'youtube' ORDER BY views DESC LIMIT 10",
        args: [userId],
      });
      videosList = fallbackVideosRes.rows;
    }

    const topVideosSummary = videosList.map((v) => {
      const title = v.title as string;
      const views = (v.views as number) || 0;
      const ctr = (v.ctr as number) || 0;
      const likes = (v.likes as number) || 0;
      const rev = (v.revenue as number) || 0;
      return `• "${title}" | ${views.toLocaleString()} views | CTR: ${nFix(ctr, 1)}% | Likes: ${likes.toLocaleString()} | Rev: $${nFix(rev, 2)}`;
    });

    // 3. Fetch Recent Uploads
    const recentRes = await db.execute({
      sql: "SELECT title, views, published_at FROM youtube_videos WHERE user_id = ? ORDER BY published_at DESC LIMIT 5",
      args: [userId],
    });
    const recentUploadsSummary = recentRes.rows.map((v) => {
      const title = v.title as string;
      const views = (v.views as number) || 0;
      const date = (v.published_at as string) || "Recent";
      return `• "${title}" (${date.split("T")[0]}) — ${views.toLocaleString()} views`;
    });

    // 4. Fetch 30-Day Aggregates
    const date30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const stats30Res = await db.execute({
      sql: `SELECT
              SUM(views) as totalViews,
              SUM(estimated_minutes_watched) as totalWatchTime,
              SUM(estimated_revenue) as totalRevenue,
              AVG(ctr) as avgCtr
            FROM youtube_analytics WHERE user_id = ? AND date >= ?`,
      args: [userId, date30],
    });
    const row30 = stats30Res.rows[0];

    const retentionRes = await db.execute({
      sql: `SELECT AVG(average_view_percentage) as avgRetention FROM youtube_videos WHERE user_id = ? AND average_view_percentage > 0`,
      args: [userId],
    });
    const rawRetention = retentionRes.rows[0]?.avgRetention;

    const channelWatchMins = Number(ch?.watch_time_minutes || 0);
    const watchTime30d =
      channelWatchMins > 0
        ? Math.round((channelWatchMins / 60) * 100) / 100
        : Math.round(((row30?.totalWatchTime as number) || 0) / 60);
    const revenue30d = Math.round(((row30?.totalRevenue as number) || 0) * 100) / 100;
    const avgCtr = Math.round(((row30?.avgCtr as number) || 0) * 100) / 100;

    // Retention: only report it if we actually have it. Never a fabricated placeholder.
    const hasRetentionData = rawRetention !== null && rawRetention !== undefined && Number(rawRetention) > 0;
    const avgRetention = hasRetentionData ? Math.round(Number(rawRetention) * 100) / 100 : null;

    // 5. Build Content Insights Summary
    const contentInsights = [
      `Channel: "${channelTitle}"`,
      `Subscribers: ${subscribers.toLocaleString()}`,
      `Total Channel Views: ${totalViews.toLocaleString()}`,
      `Total Videos: ${videoCount}`,
      `Past 30 Days: ${((row30?.totalViews as number) || 0).toLocaleString()} views, ${watchTime30d} watch hours, $${revenue30d.toFixed(2)} estimated revenue.`,
      `Channel Averages: ${avgCtr}% CTR${avgRetention !== null ? `, ${avgRetention}% average view duration` : " (retention data not yet available)"}.`,
    ].join("\n");

    // 6. Persist brain snapshot
    await db.execute({
      sql: `
        INSERT INTO user_brain (
          user_id, channel_title, subscribers, total_views, video_count,
          avg_ctr, avg_retention, watch_time_30d, revenue_30d,
          top_video_titles, recent_upload_titles, content_insights, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          channel_title = excluded.channel_title,
          subscribers = excluded.subscribers,
          total_views = excluded.total_views,
          video_count = excluded.video_count,
          avg_ctr = excluded.avg_ctr,
          avg_retention = excluded.avg_retention,
          watch_time_30d = excluded.watch_time_30d,
          revenue_30d = excluded.revenue_30d,
          top_video_titles = excluded.top_video_titles,
          recent_upload_titles = excluded.recent_upload_titles,
          content_insights = excluded.content_insights,
          updated_at = datetime('now')
      `,
      args: [
        userId,
        channelTitle,
        subscribers,
        totalViews,
        videoCount,
        avgCtr,
        avgRetention,
        watchTime30d,
        revenue30d,
        JSON.stringify(topVideosSummary),
        JSON.stringify(recentUploadsSummary),
        contentInsights,
      ],
    });

    // 7. Record genuine computed insights based on real state deltas
    try {
      await recordComputedInsights(userId, prev, {
        subscribers,
        totalViews,
        watchTime30d,
        revenue30d,
        topVideoLine: topVideosSummary[0],
        latestUploadLine: recentUploadsSummary[0],
      });
    } catch (insightErr) {
      console.warn("[UserBrain] Failed to record computed insights:", insightErr);
    }

    return {
      userId,
      hasYouTube,
      channelTitle,
      subscribers,
      totalViews,
      videoCount,
      avgCtr,
      avgRetention,
      watchTime30d,
      revenue30d,
      topVideosSummary,
      recentUploadsSummary,
      contentInsights,
      customMemories: [],
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[UserBrain] Sync failed for user ${userId}:`, err);
    throw err;
  }
}

/**
 * Compares current sync against previous snapshot and logs genuine insights.
 */
async function recordComputedInsights(
  userId: string,
  prevRow: Record<string, unknown> | undefined,
  current: {
    subscribers: number;
    totalViews: number;
    watchTime30d: number;
    revenue30d: number;
    topVideoLine?: string;
    latestUploadLine?: string;
  }
): Promise<void> {
  const insights: string[] = [];

  if (prevRow) {
    const prevSubs = Number(prevRow.subscribers || 0);
    const prevViews = Number(prevRow.total_views || 0);

    if (prevSubs > 0 && current.subscribers !== prevSubs) {
      const pct = (((current.subscribers - prevSubs) / prevSubs) * 100).toFixed(1);
      insights.push(`Subscribers moved from ${prevSubs.toLocaleString()} to ${current.subscribers.toLocaleString()} (${pct}%) since the last sync.`);
    }
    if (prevViews > 0 && current.totalViews !== prevViews) {
      const pct = (((current.totalViews - prevViews) / prevViews) * 100).toFixed(1);
      insights.push(`Total channel views moved from ${prevViews.toLocaleString()} to ${current.totalViews.toLocaleString()} (${pct}%) since the last sync.`);
    }
  }

  if (current.latestUploadLine) {
    insights.push(`Most recent upload: ${current.latestUploadLine}`);
  }
  if (current.topVideoLine) {
    insights.push(`Current top performer: ${current.topVideoLine}`);
  }

  if (insights.length === 0) return;

  for (const summaryText of insights) {
    await db.execute({
      sql: `INSERT INTO ai_learning_log (id, user_id, insight_type, insight_summary, created_at)
            VALUES (?, ?, 'computed_delta', ?, datetime('now'))`,
      args: [randomUUID(), userId, summaryText],
    });
  }

  // Keep the log bounded per user
  await db.execute({
    sql: `DELETE FROM ai_learning_log
          WHERE user_id = ? AND id NOT IN (
            SELECT id FROM ai_learning_log WHERE user_id = ?
            ORDER BY created_at DESC LIMIT ?
          )`,
    args: [userId, userId, MAX_LEARNING_LOG_PER_USER],
  });
}

/**
 * Retrieves formatted AI Brain context for system prompt injection.
 */
export async function getUserBrainContext(
  userId: string,
  staleAfterMs: number = 5 * 60_000
): Promise<{ hasYouTube: boolean; summary: string }> {
  try {
    const res = await db.execute({
      sql: "SELECT * FROM user_brain WHERE user_id = ?",
      args: [userId],
    });

    const now = Date.now();
    const lastUpdated = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at as string).getTime() : 0;

    let brain: UserBrainData;
    if (res.rows.length === 0 || now - lastUpdated > staleAfterMs) {
      brain = await syncUserBrain(userId);
    } else {
      const row = res.rows[0];
      brain = {
        userId,
        hasYouTube: await checkHasYouTube(userId),
        channelTitle: (row.channel_title as string) || "YouTube Channel",
        subscribers: (row.subscribers as number) || 0,
        totalViews: (row.total_views as number) || 0,
        videoCount: (row.video_count as number) || 0,
        avgCtr: (row.avg_ctr as number) || 0,
        avgRetention: row.avg_retention === null || row.avg_retention === undefined ? null : (row.avg_retention as number),
        watchTime30d: (row.watch_time_30d as number) || 0,
        revenue30d: (row.revenue_30d as number) || 0,
        topVideosSummary: safeJsonParse<string[]>(row.top_video_titles as string, []),
        recentUploadsSummary: safeJsonParse<string[]>(row.recent_upload_titles as string, []),
        contentInsights: (row.content_insights as string) || "",
        customMemories: safeJsonParse<string[]>(row.custom_memories as string, []),
        updatedAt: (row.updated_at as string) || "",
      };
    }

    if (!brain.hasYouTube) {
      return {
        hasYouTube: false,
        summary: "YouTube account is not connected yet. Prompt the user to connect YouTube in Content Studio.",
      };
    }

    let recentInsights: string[] = [];
    try {
      const insightsRes = await db.execute({
        sql: `SELECT insight_summary FROM ai_learning_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
        args: [userId],
      });
      recentInsights = insightsRes.rows.map((r) => r.insight_summary as string);
    } catch (e) {
      console.warn("[UserBrain] Failed to fetch recent insights:", e);
    }

    const lines: string[] = [
      `=== USER CHANNEL CONTEXT ===`,
      `Channel: "${brain.channelTitle}"`,
      `Subscribers: ${brain.subscribers.toLocaleString()}`,
      `Total Channel Views: ${brain.totalViews.toLocaleString()}`,
      `Total Videos Published: ${brain.videoCount}`,
      `Past 30-Day Watch Time: ${brain.watchTime30d.toLocaleString()} hours`,
      `Past 30-Day Revenue: $${nFix(brain.revenue30d, 2)}`,
      `Average Channel CTR: ${nFix(brain.avgCtr, 1)}%`,
      `Average Audience Retention: ${brain.avgRetention !== null ? `${nFix(brain.avgRetention, 1)}%` : "not available yet"}`,
    ];

    if (brain.topVideosSummary.length > 0) {
      lines.push(`\n--- TOP PERFORMING CONTENT ---`, ...brain.topVideosSummary.slice(0, 5));
    }
    if (brain.recentUploadsSummary.length > 0) {
      lines.push(`\n--- RECENT UPLOADS ---`, ...brain.recentUploadsSummary);
    }
    if (recentInsights.length > 0) {
      lines.push(`\n--- RECENT CHANGES ---`, ...recentInsights.map((k) => `• ${k}`));
    }
    if (brain.customMemories.length > 0) {
      lines.push(`\n--- USER PREFERENCES & MEMORIES ---`, ...brain.customMemories.map((m) => `• ${m}`));
    }

    try {
      const activityRes = await db.execute({
        sql: `SELECT action, details, page, created_at FROM user_activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        args: [userId, MAX_ACTIVITY_LINES],
      });
      if (activityRes.rows.length > 0) {
        lines.push(`\n--- RECENT ACTIVITY ---`);
        for (const act of activityRes.rows) {
          const pageStr = act.page ? ` [Page: ${act.page}]` : "";
          const detailsStr = act.details ? ` - ${act.details}` : "";
          lines.push(`• ${act.created_at}: ${act.action}${pageStr}${detailsStr}`);
        }
      }
    } catch (actErr) {
      console.warn("[UserBrain] Failed to fetch recent user activity logs:", actErr);
    }

    lines.push(`=== END CONTEXT ===`);

    let summary = lines.join("\n");
    if (summary.length > MAX_PROMPT_CHARS) {
      summary = summary.slice(0, MAX_PROMPT_CHARS) + "\n[...older context truncated...]";
    }

    return { hasYouTube: true, summary };
  } catch (err) {
    console.error("[UserBrain] Error fetching brain context:", err);
    return { hasYouTube: false, summary: "Error loading user brain context." };
  }
}
