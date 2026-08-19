/**
 * YouTube Comments Fetcher
 * Fetches comments from YouTube Data API v3 and stores them in the local database.
 */

import { google } from "googleapis";
import { getAuthenticatedYouTubeClient } from "./auth";
import { db } from "../../db";
import crypto from "crypto";

export interface YouTubeComment {
  id: string;
  userId: string;
  videoId: string;
  commentId: string;
  authorName: string;
  authorProfileImage: string;
  textOriginal: string;
  textDisplay: string;
  likeCount: number;
  replyCount: number;
  publishedAt: string;
  isReply: boolean;
  parentId: string | null;
  sentiment: string;
}

/**
 * Fetch comments for a specific video and store them in the database.
 */
export async function fetchVideoComments(
  userId: string,
  videoId: string,
  maxResults: number = 100
): Promise<number> {
  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  let commentsFetched = 0;
  let nextPageToken: string | undefined;

  for (let page = 0; page < 5; page++) { // Max 5 pages = ~500 comments
    try {
      const res = await youtube.commentThreads.list({
        part: ["snippet", "replies"],
        videoId,
        maxResults: Math.min(maxResults - commentsFetched, 100),
        order: "relevance",
        textFormat: "plainText",
        pageToken: nextPageToken,
      });

      const threads = res.data.items || [];
      for (const thread of threads) {
        const topComment = thread.snippet?.topLevelComment;
        if (!topComment) continue;

        const snippet = topComment.snippet;
        if (!snippet) continue;

        // Store top-level comment — use INSERT OR IGNORE so we don't wipe reply tracking.
        // Then UPDATE only the mutable metadata (likes, reply_count, text) without touching owner_replied columns.
        const commentDbId = `${userId}-${topComment.id}`;
        await db.execute({
          sql: `INSERT OR IGNORE INTO youtube_comments
                (id, user_id, video_id, comment_id, author_name, author_profile_image,
                 text_original, text_display, like_count, reply_count, published_at,
                 is_reply, parent_id, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, datetime('now'))`,
          args: [
            commentDbId,
            userId,
            videoId,
            topComment.id || crypto.randomUUID(),
            snippet.authorDisplayName || "Unknown",
            snippet.authorProfileImageUrl || "",
            snippet.textOriginal || snippet.textDisplay || "",
            snippet.textDisplay || snippet.textOriginal || "",
            snippet.likeCount || 0,
            thread.snippet?.totalReplyCount || 0,
            snippet.publishedAt || new Date().toISOString(),
          ],
        });
        // Update metadata (likes, reply counts, text) without touching reply tracking columns
        await db.execute({
          sql: `UPDATE youtube_comments SET
                  like_count = ?, reply_count = ?, text_original = ?, text_display = ?,
                  author_name = ?, author_profile_image = ?, fetched_at = datetime('now')
                WHERE id = ? AND user_id = ?`,
          args: [
            snippet.likeCount || 0,
            thread.snippet?.totalReplyCount || 0,
            snippet.textOriginal || snippet.textDisplay || "",
            snippet.textDisplay || snippet.textOriginal || "",
            snippet.authorDisplayName || "Unknown",
            snippet.authorProfileImageUrl || "",
            commentDbId,
            userId,
          ],
        });
        commentsFetched++;

        // Store replies — also use INSERT OR IGNORE to preserve any existing data
        if (thread.replies?.comments) {
          for (const reply of thread.replies.comments) {
            const rs = reply.snippet;
            if (!rs) continue;
            const replyDbId = `${userId}-${reply.id}`;
            await db.execute({
              sql: `INSERT OR IGNORE INTO youtube_comments
                    (id, user_id, video_id, comment_id, author_name, author_profile_image,
                     text_original, text_display, like_count, reply_count, published_at,
                     is_reply, parent_id, fetched_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, datetime('now'))`,
              args: [
                replyDbId,
                userId,
                videoId,
                reply.id || crypto.randomUUID(),
                rs.authorDisplayName || "Unknown",
                rs.authorProfileImageUrl || "",
                rs.textOriginal || rs.textDisplay || "",
                rs.textDisplay || rs.textOriginal || "",
                rs.likeCount || 0,
                rs.publishedAt || new Date().toISOString(),
                topComment.id || null,
              ],
            });
            // Update metadata without wiping owner_reply columns
            await db.execute({
              sql: `UPDATE youtube_comments SET
                      like_count = ?, text_original = ?, text_display = ?,
                      author_name = ?, author_profile_image = ?, fetched_at = datetime('now')
                    WHERE id = ? AND user_id = ?`,
              args: [
                rs.likeCount || 0,
                rs.textOriginal || rs.textDisplay || "",
                rs.textDisplay || rs.textOriginal || "",
                rs.authorDisplayName || "Unknown",
                rs.authorProfileImageUrl || "",
                replyDbId,
                userId,
              ],
            });
          }
        }
      }

      nextPageToken = res.data.nextPageToken || undefined;
      if (!nextPageToken || commentsFetched >= maxResults) break;
    } catch (err) {
      // Some videos have comments disabled
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("commentsDisabled") || msg.includes("forbidden")) {
        console.log(`[Comments] Comments disabled for video ${videoId}`);
        break;
      }
      console.warn(`[Comments] Error fetching page ${page} for video ${videoId}:`, msg);
      break;
    }
  }

  console.log(`[Comments] Fetched ${commentsFetched} comments for video ${videoId}`);
  return commentsFetched;
}

/**
 * Fetch comments for ALL videos of a user.
 */
export async function fetchAllComments(
  userId: string,
  maxVideos: number = 20,
  maxCommentsPerVideo: number = 100
): Promise<{ videosProcessed: number; totalComments: number }> {
  // Get video IDs from youtube_videos table
  const videosResult = await db.execute({
    sql: `SELECT video_id, title FROM youtube_videos WHERE user_id = ? ORDER BY views DESC LIMIT ?`,
    args: [userId, maxVideos],
  });

  let totalComments = 0;
  let videosProcessed = 0;

  for (const row of videosResult.rows) {
    const videoId = row.video_id as string;
    try {
      const count = await fetchVideoComments(userId, videoId, maxCommentsPerVideo);
      totalComments += count;
      videosProcessed++;
    } catch (err) {
      console.warn(`[Comments] Skipping video ${videoId}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[Comments] Total: ${totalComments} comments from ${videosProcessed} videos for user ${userId.substring(0, 8)}...`);
  return { videosProcessed, totalComments };
}

/**
 * Get stored comments from the database.
 */
export async function getStoredComments(
  userId: string,
  options: {
    videoId?: string;
    sentiment?: string;
    sortBy?: "newest" | "likes" | "replies";
    limit?: number;
    offset?: number;
  } = {}
): Promise<YouTubeComment[]> {
  const { videoId, sentiment, sortBy = "newest", limit = 100, offset = 0 } = options;

  let where = "WHERE user_id = ? AND is_reply = 0";
  const args: unknown[] = [userId];

  if (videoId) {
    where += " AND video_id = ?";
    args.push(videoId);
  }
  if (sentiment) {
    where += " AND sentiment = ?";
    args.push(sentiment);
  }

  let orderBy = "published_at DESC";
  if (sortBy === "likes") orderBy = "like_count DESC";
  if (sortBy === "replies") orderBy = "reply_count DESC";

  args.push(limit, offset);

  const result = await db.execute({
    sql: `SELECT * FROM youtube_comments ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    args,
  });

  return result.rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    videoId: row.video_id as string,
    commentId: row.comment_id as string,
    authorName: row.author_name as string,
    authorProfileImage: row.author_profile_image as string,
    textOriginal: row.text_original as string,
    textDisplay: row.text_display as string,
    likeCount: (row.like_count as number) || 0,
    replyCount: (row.reply_count as number) || 0,
    publishedAt: row.published_at as string,
    isReply: (row.is_reply as number) === 1,
    parentId: row.parent_id as string | null,
    sentiment: (row.sentiment as string) || "neutral",
    ownerReplied: (row.owner_replied as number) === 1,
    ownerReplyText: (row.owner_reply_text as string) || undefined,
    ownerReplyAt: (row.owner_reply_at as string) || undefined,
    ownerReplyYoutubeId: (row.owner_reply_youtube_id as string) || undefined,
  }));
}

/**
 * Get comment statistics summary (optionally filtered by videoId).
 */
export async function getCommentStats(userId: string, videoId?: string): Promise<{
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  totalLikes: number;
  avgLikes: number;
  totalReplies: number;
  videoCount: number;
  replied: number;
  unreplied: number;
}> {
  let sql = `SELECT
              COUNT(*) as total,
              SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
              SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
              SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
              SUM(like_count) as total_likes,
              AVG(like_count) as avg_likes,
              SUM(reply_count) as total_replies,
              COUNT(DISTINCT video_id) as video_count,
              SUM(CASE WHEN owner_replied = 1 THEN 1 ELSE 0 END) as replied
            FROM youtube_comments WHERE user_id = ? AND is_reply = 0`;
  const args: unknown[] = [userId];

  if (videoId) {
    sql += " AND video_id = ?";
    args.push(videoId);
  }

  const result = await db.execute({ sql, args });

  const row = result.rows[0];
  const total = (row?.total as number) || 0;
  const replied = (row?.replied as number) || 0;
  return {
    total,
    positive: (row?.positive as number) || 0,
    negative: (row?.negative as number) || 0,
    neutral: (row?.neutral as number) || 0,
    totalLikes: (row?.total_likes as number) || 0,
    avgLikes: Math.round((row?.avg_likes as number) || 0),
    totalReplies: (row?.total_replies as number) || 0,
    videoCount: (row?.video_count as number) || 0,
    replied,
    unreplied: Math.max(0, total - replied),
  };
}
