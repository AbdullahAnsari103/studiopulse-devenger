import { google } from "googleapis";
import { getAuthenticatedYouTubeClient, handleYouTubeApiError } from "./auth";
import { db } from "../../db";

/**
 * Format ISO 8601 duration string (PT10M45S) into standard MM:SS or HH:MM:SS format.
 */
function parseISO8601Duration(durationStr: string): string {
  if (!durationStr) return "10:45";
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "10:45";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/**
 * Sync YouTube channel data into the local database.
 * Fetches latest channel stats and ALL videos (including private, unlisted, scheduled),
 * then upserts into analytics and youtube_videos tables.
 */
export async function syncYouTubeData(userId: string) {
  try {
    const oauth2Client = await getAuthenticatedYouTubeClient(userId);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    // Fetch channel data
    const channelRes = await youtube.channels.list({
      part: ["snippet", "statistics", "contentDetails"],
      mine: true,
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) {
      throw new Error("No YouTube channel found.");
    }

    const subscribers = parseInt(channel.statistics?.subscriberCount || "0", 10);
    const totalViews = parseInt(channel.statistics?.viewCount || "0", 10);
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    // Upsert analytics record for today
    const today = new Date().toISOString().split("T")[0];
    const analyticsId = `${userId}-youtube-${today}`;

    await db.execute({
      sql: `
        INSERT INTO analytics (id, user_id, platform, views, revenue, subscribers, engagement, date)
        VALUES (?, ?, 'youtube', ?, 0, ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET
          views = excluded.views,
          subscribers = excluded.subscribers,
          date = excluded.date
      `,
      args: [analyticsId, userId, totalViews, subscribers, today],
    });

    // Collect all video IDs for the user's channel
    const videoIdSet = new Set<string>();

    // Method 1: Fetch via forMine search to catch private & unlisted videos
    try {
      const searchRes = await youtube.search.list({
        part: ["id"],
        forMine: true,
        type: ["video"],
        maxResults: 50,
      });
      searchRes.data.items?.forEach((item) => {
        if (item.id?.videoId) videoIdSet.add(item.id.videoId);
      });
    } catch {
      // Fall back if forMine search fails
    }

    // Method 2: Fetch via uploads playlist
    if (uploadsPlaylistId) {
      try {
        const playlistRes = await youtube.playlistItems.list({
          part: ["contentDetails"],
          playlistId: uploadsPlaylistId,
          maxResults: 50,
        });
        playlistRes.data.items?.forEach((item) => {
          if (item.contentDetails?.videoId) videoIdSet.add(item.contentDetails.videoId);
        });
      } catch {
        // Uploads playlist fetch error
      }
    }

    const videoIds = Array.from(videoIdSet);
    let videosUpdated = 0;

    if (videoIds.length > 0) {
      // Fetch full video details with snippet, status, contentDetails, and statistics
      const videosRes = await youtube.videos.list({
        part: ["snippet", "status", "contentDetails", "statistics"],
        id: videoIds,
      });

      for (const video of videosRes.data.items || []) {
        const videoDbId = `${userId}-youtube-${video.id}`;

        const privacyStatus = video.status?.privacyStatus || "public"; // "public" | "private" | "unlisted"
        const isScheduled = video.status?.publishAt ? 1 : 0;
        const scheduledAt = video.status?.publishAt || null;
        const durationFormatted = parseISO8601Duration(video.contentDetails?.duration || "");

        const title = video.snippet?.title || "Untitled Video";
        const description = video.snippet?.description || "";
        const thumbnail = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.standard?.url || video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || "";
        const views = parseInt(video.statistics?.viewCount || "0", 10);
        const likes = parseInt(video.statistics?.likeCount || "0", 10);
        const comments = parseInt(video.statistics?.commentCount || "0", 10);
        const publishedAt = video.snippet?.publishedAt || new Date().toISOString();
        const tags = JSON.stringify(video.snippet?.tags || []);
        const categoryId = video.snippet?.categoryId || "22";
        const language = video.snippet?.defaultLanguage || "en";

        // Map privacyStatus to visibility & status
        const visibility = isScheduled ? "scheduled" : privacyStatus;
        const status = isScheduled ? "scheduled" : privacyStatus === "public" ? "published" : privacyStatus;

        // Upsert into youtube_videos table
        await db.execute({
          sql: `
            INSERT INTO youtube_videos (
              id, user_id, video_id, title, description, thumbnail,
              views, likes, comments, published_at, duration,
              category, visibility, status, privacy_status, tags, language,
              scheduled_at, monetization_status, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Monetized', datetime('now'))
            ON CONFLICT(user_id, video_id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              thumbnail = excluded.thumbnail,
              views = excluded.views,
              likes = excluded.likes,
              comments = excluded.comments,
              visibility = excluded.visibility,
              status = excluded.status,
              privacy_status = excluded.privacy_status,
              tags = excluded.tags,
              duration = excluded.duration,
              updated_at = datetime('now')
          `,
          args: [
            videoDbId, userId, video.id || "", title, description, thumbnail,
            views, likes, comments, publishedAt, durationFormatted,
            categoryId, visibility, status, privacyStatus, tags, language,
            scheduledAt,
          ],
        });

        // Also upsert into general videos table for legacy compatibility
        await db.execute({
          sql: `
            INSERT INTO videos (id, user_id, platform, video_id, title, thumbnail, views, revenue, likes, comments, uploaded_at)
            VALUES (?, ?, 'youtube', ?, ?, ?, ?, 0, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              thumbnail = excluded.thumbnail,
              views = excluded.views,
              likes = excluded.likes,
              comments = excluded.comments
          `,
          args: [videoDbId, userId, video.id || "", title, thumbnail, views, likes, comments, publishedAt],
        });

        videosUpdated++;
      }
    }

    // Prune videos from database that were deleted on YouTube (preserve future scheduled items)
    if (videoIds.length > 0) {
      const placeholders = videoIds.map(() => "?").join(",");
      await db.execute({
        sql: `DELETE FROM youtube_videos WHERE user_id = ? AND status != 'scheduled' AND video_id NOT IN (${placeholders})`,
        args: [userId, ...videoIds],
      });
      await db.execute({
        sql: `DELETE FROM videos WHERE user_id = ? AND platform = 'youtube' AND video_id NOT IN (${placeholders})`,
        args: [userId, ...videoIds],
      });
    } else {
      await db.execute({
        sql: `DELETE FROM youtube_videos WHERE user_id = ? AND status != 'scheduled'`,
        args: [userId],
      });
      await db.execute({
        sql: `DELETE FROM videos WHERE user_id = ? AND platform = 'youtube'`,
        args: [userId],
      });
    }

    // Update last_sync timestamp on connected_platforms
    await db.execute({
      sql: "UPDATE connected_platforms SET last_sync = datetime('now') WHERE user_id = ? AND platform = 'youtube'",
      args: [userId],
    });

    return {
      success: true,
      videosUpdated,
      analyticsUpdated: true,
      lastSync: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return await handleYouTubeApiError(userId, err);
  }
}
