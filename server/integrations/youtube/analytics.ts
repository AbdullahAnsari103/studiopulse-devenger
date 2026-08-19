import { google } from "googleapis";
import { getAuthenticatedYouTubeClient, handleYouTubeApiError } from "./auth";
import type { PlatformAnalytics, VideoAnalytics } from "../types";

/**
 * Fetch comprehensive YouTube analytics for a connected user.
 * Retrieves channel stats, top videos, and latest uploads.
 */
export async function fetchYouTubeAnalytics(userId: string): Promise<PlatformAnalytics> {
  try {
    const oauth2Client = await getAuthenticatedYouTubeClient(userId);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // 1. Fetch channel statistics
    const channelRes = await youtube.channels.list({
      part: ["snippet", "statistics", "contentDetails"],
      mine: true,
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found.");
    }

    const channelName = channel.snippet?.title || "Unknown";
    const subscribers = parseInt(channel.statistics?.subscriberCount || "0", 10);
    const totalViews = parseInt(channel.statistics?.viewCount || "0", 10);
    const totalVideos = parseInt(channel.statistics?.videoCount || "0", 10);
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // 2. Fetch latest uploads (up to 20)
    let latestVideoIds: string[] = [];
    if (uploadsPlaylistId) {
      const playlistRes = await youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId: uploadsPlaylistId,
        maxResults: 20,
      });
      latestVideoIds = playlistRes.data.items?.map(item => item.contentDetails?.videoId || "").filter(Boolean) || [];
    }

    // 3. Fetch video details and statistics for those videos
    let videoDetails: VideoAnalytics[] = [];
    if (latestVideoIds.length > 0) {
      const videosRes = await youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        id: latestVideoIds,
      });

      videoDetails = (videosRes.data.items || []).map(video => ({
        videoId: video.id || "",
        title: video.snippet?.title || "",
        thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || "",
        views: parseInt(video.statistics?.viewCount || "0", 10),
        likes: parseInt(video.statistics?.likeCount || "0", 10),
        comments: parseInt(video.statistics?.commentCount || "0", 10),
        revenue: 0, // Revenue requires YouTube Analytics API with monetization approval
        publishedAt: video.snippet?.publishedAt || "",
        duration: video.contentDetails?.duration || "",
      }));
    }

    // 4. Sort for top videos (by views) and latest uploads (by date)
    const topVideos = [...videoDetails].sort((a, b) => b.views - a.views).slice(0, 10);
    const latestUploads = [...videoDetails].sort((a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ).slice(0, 10);

    // 5. Try to get watch time via YouTube Analytics API
    let watchTimeHours = 0;
    let revenue = 0;
    try {
      const youtubeAnalytics = google.youtubeAnalytics({ version: "v2", auth: oauth2Client });
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const analyticsRes = await youtubeAnalytics.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics: "estimatedMinutesWatched,estimatedRevenue",
        dimensions: "day",
      });

      if (analyticsRes.data.rows) {
        for (const row of analyticsRes.data.rows) {
          watchTimeHours += (row[1] as number) / 60;
          revenue += row[2] as number;
        }
      }
    } catch {
      // YouTube Analytics API may not be available for all channels (e.g., not monetized)
      // We fall back to 0 for these metrics
    }

    return {
      channelName,
      subscribers,
      totalViews,
      totalVideos,
      watchTimeHours: Math.round(watchTimeHours),
      revenue: Math.round(revenue * 100) / 100,
      topVideos,
      latestUploads,
    };
  } catch (err: unknown) {
    return await handleYouTubeApiError(userId, err);
  }
}
