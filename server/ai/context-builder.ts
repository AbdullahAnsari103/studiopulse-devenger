/**
 * Builds structured analytics context for Gemini from database records.
 * This is the "brain" that transforms raw DB data into AI-digestible insights.
 */

import { db } from "../db";
import type { AIIntent } from "./intent-detector";
import { getRequiredDataCategories } from "./intent-detector";

function nFix(val: number | null | undefined, digits: number = 2): string {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toFixed(digits);
}

export interface AnalyticsContext {
  hasYouTube: boolean;
  channel?: ChannelContext;
  topVideos?: VideoContext[];
  bottomVideos?: VideoContext[];
  recentUploads?: VideoContext[];
  shorts?: VideoContext[];
  dailyAnalytics?: DailyAnalyticsContext[];
  revenueSummary?: RevenueSummary;
  summary: string; // Natural language summary for Gemini
}

interface ChannelContext {
  title: string;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
}

interface VideoContext {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  ctr: number;
  impressions: number;
  watchTimeMinutes: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  revenue: number;
  publishedAt: string;
  isShort: boolean;
  subscribersGained: number;
}

interface DailyAnalyticsContext {
  date: string;
  views: number;
  watchTimeMinutes: number;
  subscribersGained: number;
  subscribersLost: number;
  impressions: number;
  ctr: number;
  revenue: number;
}

interface RevenueSummary {
  last7Days: number;
  last30Days: number;
  last90Days: number;
  topRevenueVideos: { title: string; revenue: number; views: number }[];
}

/**
 * Build analytics context based on the detected intent and available data.
 */
export async function buildAnalyticsContext(
  userId: string,
  intent: AIIntent
): Promise<AnalyticsContext> {
  console.log(`[ContextBuilder] Building context for userId=${userId}, intent=${intent}`);

  // Check if YouTube is connected
  const connectionResult = await db.execute({
    sql: "SELECT * FROM connected_platforms WHERE user_id = ? AND platform = 'youtube' AND is_connected = 1",
    args: [userId],
  });

  const hasYouTube = connectionResult.rows.length > 0;
  console.log(`[ContextBuilder] YouTube connected: ${hasYouTube} (${connectionResult.rows.length} rows)`);

  if (!hasYouTube) {
    return {
      hasYouTube: false,
      summary: "YouTube is not connected. No platform analytics data available.",
    };
  }

  const categories = getRequiredDataCategories(intent);
  console.log(`[ContextBuilder] Required data categories: ${categories.join(", ")}`);
  const context: AnalyticsContext = { hasYouTube: true, summary: "" };
  const summaryParts: string[] = [];

  // Fetch channel data
  if (categories.includes("channel")) {
    const channelResult = await db.execute({
      sql: "SELECT * FROM youtube_channels WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
      args: [userId],
    });

    console.log(`[ContextBuilder] youtube_channels rows: ${channelResult.rows.length}`);
    if (channelResult.rows.length > 0) {
      const ch = channelResult.rows[0];
      console.log(`[ContextBuilder] Channel: "${ch.title}" | subs=${ch.subscriber_count} | views=${ch.view_count} | videos=${ch.video_count}`);
      context.channel = {
        title: ch.title as string,
        subscribers: ch.subscriber_count as number,
        totalViews: ch.view_count as number,
        totalVideos: ch.video_count as number,
      };
      summaryParts.push(
        `Channel: "${ch.title}" | ${ch.subscriber_count} subscribers | ${ch.view_count} total views | ${ch.video_count} videos`
      );
    } else {
      console.warn(`[ContextBuilder] WARNING: No channel data found for userId=${userId}`);
    }
  }

  // Fetch videos with metrics
  if (categories.includes("videos") || categories.includes("video_metrics")) {
    const videosResult = await db.execute({
      sql: `SELECT * FROM youtube_videos WHERE user_id = ? AND is_short = 0 
            ORDER BY views DESC LIMIT 50`,
      args: [userId],
    });

    console.log(`[ContextBuilder] youtube_videos rows: ${videosResult.rows.length}`);
    if (videosResult.rows.length > 0) {
      console.log(`[ContextBuilder] First video: "${videosResult.rows[0].title}" views=${videosResult.rows[0].views}`);
    } else {
      console.warn(`[ContextBuilder] WARNING: No video data found for userId=${userId}`);
    }

    const allVideos = videosResult.rows.map((v) => ({
      videoId: v.video_id as string,
      title: (v.title as string) || "Untitled Video",
      views: Number(v.views || 0),
      likes: Number(v.likes || 0),
      comments: Number(v.comments || 0),
      ctr: Number(v.ctr || 0),
      impressions: Number(v.impressions || 0),
      watchTimeMinutes: Number(v.watch_time_minutes || 0),
      averageViewDuration: Number(v.average_view_duration || 0),
      averageViewPercentage: Number(v.average_view_percentage || 0),
      revenue: Number(v.revenue || 0),
      publishedAt: (v.published_at as string) || "",
      isShort: (v.is_short as number) === 1,
      subscribersGained: Number(v.subscribers_gained || 0),
    }));

    // Top 10 by views
    context.topVideos = allVideos.slice(0, 10);

    // Bottom 10 (by CTR, filtering out 0 impressions)
    const withImpressions = allVideos.filter((v) => v.impressions > 0);
    context.bottomVideos = [...withImpressions]
      .sort((a, b) => a.ctr - b.ctr)
      .slice(0, 10);

    // Recent uploads (by date)
    context.recentUploads = [...allVideos]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10);

    if (context.topVideos.length > 0) {
      summaryParts.push(`\n--- TOP PERFORMING VIDEOS (by views) ---`);
      for (const v of context.topVideos) {
        summaryParts.push(
          `• "${v.title}" | Views: ${v.views} | CTR: ${nFix(v.ctr, 1)}% | Impressions: ${v.impressions} | Watch Time: ${Math.round(v.watchTimeMinutes)} min | Revenue: $${nFix(v.revenue, 2)} | Likes: ${v.likes} | Comments: ${v.comments} | Subs Gained: ${v.subscribersGained} | Published: ${v.publishedAt}`
        );
      }
    }

    if (context.bottomVideos.length > 0) {
      summaryParts.push(`\n--- LOWEST CTR VIDEOS (potential improvement targets) ---`);
      for (const v of context.bottomVideos) {
        summaryParts.push(
          `• "${v.title}" | CTR: ${nFix(v.ctr, 1)}% | Impressions: ${v.impressions} | Views: ${v.views} | Retention: ${nFix(v.averageViewPercentage, 1)}%`
        );
      }
    }

    if (context.recentUploads && context.recentUploads.length > 0) {
      summaryParts.push(`\n--- RECENT UPLOADS ---`);
      for (const v of context.recentUploads.slice(0, 5)) {
        summaryParts.push(
          `• "${v.title}" | Published: ${v.publishedAt} | Views: ${v.views} | CTR: ${nFix(v.ctr, 1)}% | Likes: ${v.likes}`
        );
      }
    }

    // Calculate channel averages
    if (withImpressions.length > 0) {
      const avgCTR = withImpressions.reduce((sum, v) => sum + v.ctr, 0) / withImpressions.length;
      const avgRetention = withImpressions.reduce((sum, v) => sum + v.averageViewPercentage, 0) / withImpressions.length;
      summaryParts.push(
        `\n--- CHANNEL AVERAGES ---\nAverage CTR: ${nFix(avgCTR, 2)}% | Average Retention: ${nFix(avgRetention, 1)}%`
      );
    }
  }

  // Fetch shorts
  if (categories.includes("shorts")) {
    const shortsResult = await db.execute({
      sql: `SELECT * FROM youtube_videos WHERE user_id = ? AND is_short = 1 
            ORDER BY views DESC LIMIT 20`,
      args: [userId],
    });

    context.shorts = shortsResult.rows.map((v) => ({
      videoId: v.video_id as string,
      title: v.title as string,
      views: v.views as number,
      likes: v.likes as number,
      comments: v.comments as number,
      ctr: v.ctr as number,
      impressions: v.impressions as number,
      watchTimeMinutes: v.watch_time_minutes as number,
      averageViewDuration: v.average_view_duration as number,
      averageViewPercentage: v.average_view_percentage as number,
      revenue: v.revenue as number,
      publishedAt: v.published_at as string,
      isShort: true,
      subscribersGained: v.subscribers_gained as number,
    }));

    if (context.shorts.length > 0) {
      summaryParts.push(`\n--- SHORTS PERFORMANCE ---`);
      for (const v of context.shorts.slice(0, 10)) {
        summaryParts.push(
          `• "${v.title}" | Views: ${v.views} | Likes: ${v.likes} | Published: ${v.publishedAt}`
        );
      }
    }
  }

  // Fetch daily analytics
  if (categories.includes("daily_analytics") || categories.includes("recent_analytics")) {
    const days = categories.includes("daily_analytics") ? 90 : 30;
    const analyticsResult = await db.execute({
      sql: `SELECT * FROM youtube_analytics WHERE user_id = ? 
            ORDER BY date DESC LIMIT ?`,
      args: [userId, days],
    });

    context.dailyAnalytics = analyticsResult.rows.map((a) => ({
      date: a.date as string,
      views: Number(a.views || 0),
      watchTimeMinutes: Number(a.estimated_minutes_watched || 0),
      subscribersGained: Number(a.subscribers_gained || 0),
      subscribersLost: Number(a.subscribers_lost || 0),
      impressions: Number(a.impressions || 0),
      ctr: Number(a.ctr || 0),
      revenue: Number(a.estimated_revenue || 0),
    }));

    if (context.dailyAnalytics.length > 0) {
      // Calculate weekly comparison
      const last7 = context.dailyAnalytics.slice(0, 7);
      const prev7 = context.dailyAnalytics.slice(7, 14);

      const thisWeekViews = last7.reduce((sum, d) => sum + d.views, 0);
      const lastWeekViews = prev7.reduce((sum, d) => sum + d.views, 0);
      const viewsChange = lastWeekViews > 0 ? ((thisWeekViews - lastWeekViews) / lastWeekViews * 100) : 0;

      const thisWeekRevenue = last7.reduce((sum, d) => sum + d.revenue, 0);
      const lastWeekRevenue = prev7.reduce((sum, d) => sum + d.revenue, 0);

      const thisWeekSubs = last7.reduce((sum, d) => sum + d.subscribersGained - d.subscribersLost, 0);

      summaryParts.push(`\n--- WEEKLY COMPARISON ---`);
      summaryParts.push(`This week: ${thisWeekViews} views (${viewsChange >= 0 ? '+' : ''}${nFix(viewsChange, 1)}% vs last week) | Revenue: $${nFix(thisWeekRevenue, 2)} (last week: $${nFix(lastWeekRevenue, 2)}) | Net Subscribers: ${thisWeekSubs >= 0 ? '+' : ''}${thisWeekSubs}`);

      summaryParts.push(`\n--- DAILY ANALYTICS (last 14 days) ---`);
      for (const d of context.dailyAnalytics.slice(0, 14)) {
        summaryParts.push(
          `${d.date}: Views ${d.views} | Watch Time: ${Math.round(d.watchTimeMinutes)} min | Revenue: $${nFix(d.revenue, 2)} | Subs: +${d.subscribersGained}/-${d.subscribersLost} | CTR: ${nFix(d.ctr, 2)}%`
        );
      }
    }
  }

  // Fetch revenue summary
  if (categories.includes("revenue") || categories.includes("video_revenue")) {
    const now = new Date();
    const date7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const date30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const date90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [rev7Result, rev30Result, rev90Result] = await Promise.all([
      db.execute({ sql: "SELECT SUM(estimated_revenue) as total FROM youtube_analytics WHERE user_id = ? AND date >= ?", args: [userId, date7] }),
      db.execute({ sql: "SELECT SUM(estimated_revenue) as total FROM youtube_analytics WHERE user_id = ? AND date >= ?", args: [userId, date30] }),
      db.execute({ sql: "SELECT SUM(estimated_revenue) as total FROM youtube_analytics WHERE user_id = ? AND date >= ?", args: [userId, date90] }),
    ]);

    const topRevenueResult = await db.execute({
      sql: "SELECT title, revenue, views FROM youtube_videos WHERE user_id = ? AND revenue > 0 ORDER BY revenue DESC LIMIT 10",
      args: [userId],
    });

    context.revenueSummary = {
      last7Days: Number(rev7Result.rows[0]?.total || 0),
      last30Days: Number(rev30Result.rows[0]?.total || 0),
      last90Days: Number(rev90Result.rows[0]?.total || 0),
      topRevenueVideos: topRevenueResult.rows.map((r) => ({
        title: (r.title as string) || "Untitled",
        revenue: Number(r.revenue || 0),
        views: Number(r.views || 0),
      })),
    };

    summaryParts.push(`\n--- REVENUE SUMMARY ---`);
    summaryParts.push(`Last 7 days: $${nFix(context.revenueSummary.last7Days, 2)} | Last 30 days: $${nFix(context.revenueSummary.last30Days, 2)} | Last 90 days: $${nFix(context.revenueSummary.last90Days, 2)}`);
    if (context.revenueSummary.topRevenueVideos.length > 0) {
      summaryParts.push(`Top earning videos:`);
      for (const v of context.revenueSummary.topRevenueVideos) {
        summaryParts.push(`  • "${v.title}" — $${nFix(v.revenue, 2)} (${v.views} views)`);
      }
    }
  }

  context.summary = summaryParts.join("\n");
  return context;
}
