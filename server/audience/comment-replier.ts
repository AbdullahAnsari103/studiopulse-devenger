/**
 * Comment Replier — AI Reply Generation & YouTube Comment Posting
 * Handles generating AI-crafted replies and posting them directly to YouTube
 * via the YouTube Data API v3 `comments.insert()` endpoint.
 * 
 * Now features Smart Tone Matching — analyzes the creator's past manual replies
 * to learn their unique voice and generates replies that sound like them.
 */

import { google } from "googleapis";
import { getAuthenticatedYouTubeClient } from "../integrations/youtube/auth";
import { callGemini } from "../ai/gemini";
import { db } from "../db";
import crypto from "crypto";
import { getToneInstructionForPrompt } from "./tone-analyzer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreatorReplySettings {
  creatorContext: string;
  autoReplyEnabled: boolean;
  replyToPositive: boolean;
  replyToNegative: boolean;
  replyToQuestions: boolean;
  replyToNeutral: boolean;
  maxRepliesPerRun: number;
}

export interface GeneratedReply {
  commentId: string;
  replyText: string;
  postedToYouTube: boolean;
  youtubeReplyId?: string;
  // Enriched context for auto-reply results
  videoId?: string;
  videoTitle?: string;
  originalComment?: string;
  originalAuthor?: string;
  sentiment?: string;
}

// ─── Creator Context / Persona Settings ──────────────────────────────────────

/**
 * Get the creator's saved auto-reply settings and persona context.
 */
export async function getCreatorReplySettings(userId: string): Promise<CreatorReplySettings> {
  const result = await db.execute({
    sql: "SELECT * FROM auto_reply_settings WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) {
    // Return defaults
    return {
      creatorContext: "",
      autoReplyEnabled: false,
      replyToPositive: true,
      replyToNegative: true,
      replyToQuestions: true,
      replyToNeutral: false,
      maxRepliesPerRun: 10,
    };
  }

  const row = result.rows[0];
  return {
    creatorContext: (row.creator_context as string) || "",
    autoReplyEnabled: (row.auto_reply_enabled as number) === 1,
    replyToPositive: (row.reply_to_positive as number) === 1,
    replyToNegative: (row.reply_to_negative as number) === 1,
    replyToQuestions: (row.reply_to_questions as number) === 1,
    replyToNeutral: (row.reply_to_neutral as number) === 1,
    maxRepliesPerRun: (row.max_replies_per_run as number) || 10,
  };
}

/**
 * Save/update the creator's auto-reply settings and persona context.
 */
export async function saveCreatorReplySettings(
  userId: string,
  settings: Partial<CreatorReplySettings>
): Promise<CreatorReplySettings> {
  const current = await getCreatorReplySettings(userId);
  const merged = { ...current, ...settings };

  await db.execute({
    sql: `INSERT INTO auto_reply_settings (id, user_id, creator_context, auto_reply_enabled, reply_to_positive, reply_to_negative, reply_to_questions, reply_to_neutral, max_replies_per_run, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            creator_context = excluded.creator_context,
            auto_reply_enabled = excluded.auto_reply_enabled,
            reply_to_positive = excluded.reply_to_positive,
            reply_to_negative = excluded.reply_to_negative,
            reply_to_questions = excluded.reply_to_questions,
            reply_to_neutral = excluded.reply_to_neutral,
            max_replies_per_run = excluded.max_replies_per_run,
            updated_at = datetime('now')`,
    args: [
      crypto.randomUUID(),
      userId,
      merged.creatorContext,
      merged.autoReplyEnabled ? 1 : 0,
      merged.replyToPositive ? 1 : 0,
      merged.replyToNegative ? 1 : 0,
      merged.replyToQuestions ? 1 : 0,
      merged.replyToNeutral ? 1 : 0,
      merged.maxRepliesPerRun,
    ],
  });

  return merged;
}

// ─── AI Reply Generation ─────────────────────────────────────────────────────

/**
 * Generate an AI reply for a specific comment using the creator's persona context.
 */
export async function generateAIReply(
  userId: string,
  commentText: string,
  authorName: string,
  customInstruction?: string
): Promise<string> {
  const settings = await getCreatorReplySettings(userId);
  const creatorContext = customInstruction || settings.creatorContext || "";

  // ─── Smart Tone Matching: Inject the creator's learned voice profile ───
  let toneBlock = "";
  try {
    toneBlock = await getToneInstructionForPrompt(userId);
    if (toneBlock) {
      console.log(`[CommentReplier] 🎯 Tone profile injected for user ${userId.substring(0, 8)}...`);
    }
  } catch (err) {
    console.warn("[CommentReplier] Tone profile fetch failed (non-critical):", err instanceof Error ? err.message : err);
  }

  const systemPrompt = `You are a YouTube creator replying to a viewer's comment on your video.
${toneBlock}
${creatorContext ? `\nAdditional creator guidelines:\n${creatorContext}\n` : ""}
Rules:
- Write a warm, authentic, conversational reply.
- Your #1 priority is to MATCH the creator's real voice as described in the Voice Profile above. Sound exactly like them — same formality, same emoji patterns, same energy, same language mix.
- If no voice profile is provided, default to a friendly, human, conversational tone (1-3 sentences max).
- If the viewer asks a question, answer it helpfully.
- If the viewer gives praise, thank them genuinely.
- If the viewer has criticism or mocks you (e.g. using sarcastic laughing emojis), handle it gracefully with a witty comeback or self-deprecating humor. Do not just thank them for hate.
- **IMPORTANT**: The comment may be in "Hinglish" (Hindi written in English). Accurately translate and understand the Hinglish meaning before replying. If the creator's voice profile shows they use Hinglish, reply in Hinglish too.
- Do NOT use hashtags or promotional language.
- Reply ONLY with the response text. No quotes, no "Reply:" prefix, no explanation.`;

  const userMessage = `Viewer "${authorName}" commented: "${commentText}"`;

  try {
    const reply = await callGemini(systemPrompt, userMessage);
    // Clean up any surrounding quotes the AI might add
    return reply.replace(/^["']|["']$/g, "").trim();
  } catch (err) {
    console.warn("[CommentReplier] AI generation failed:", err instanceof Error ? err.message : err);
    return `Thanks for watching and sharing your thoughts, ${authorName}! Really appreciate the feedback 🙌`;
  }
}

// ─── YouTube Comment Posting ─────────────────────────────────────────────────

/**
 * Post a reply to a specific YouTube comment thread.
 * Uses youtube.comments.insert() via the authenticated OAuth2 client.
 */
export async function postReplyToYouTube(
  userId: string,
  parentCommentId: string,
  replyText: string
): Promise<{ youtubeReplyId: string; posted: boolean }> {
  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.comments.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        parentId: parentCommentId,
        textOriginal: replyText,
      },
    },
  });

  const replyId = response.data.id || "";
  console.log(`[CommentReplier] ✅ Posted reply ${replyId} to comment ${parentCommentId}`);

  return { youtubeReplyId: replyId, posted: true };
}

/**
 * Resolve the actual YouTube reply comment ID.
 * First checks the DB for stored ID, then falls back to listing
 * the comment thread on YouTube to find the channel owner's reply.
 */
async function resolveYouTubeReplyId(
  userId: string,
  commentDbId: string,
  parentCommentId: string
): Promise<string> {
  // 1. Try stored ID
  const lookup = await db.execute({
    sql: `SELECT owner_reply_youtube_id, owner_reply_text FROM youtube_comments WHERE id = ? AND user_id = ?`,
    args: [commentDbId, userId],
  });
  const storedId = lookup.rows[0]?.owner_reply_youtube_id as string | null;
  if (storedId) return storedId;

  // 2. Fallback: search YouTube for our reply in the comment thread
  console.log(`[CommentReplier] No stored reply ID for ${commentDbId}, searching YouTube thread...`);
  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    // Get the authenticated channel ID
    const channelResp = await youtube.channels.list({ part: ["id"], mine: true });
    const channelId = channelResp.data.items?.[0]?.id;
    if (!channelId) throw new Error("Could not determine your YouTube channel ID");

    // List replies to the parent comment
    const repliesResp = await youtube.comments.list({
      part: ["snippet"],
      parentId: parentCommentId,
      maxResults: 100,
      textFormat: "plainText",
    });

    const ownerReplyText = (lookup.rows[0]?.owner_reply_text as string) || "";
    const replies = repliesResp.data.items || [];

    // Find our reply — match by channel ID first, then by text similarity
    for (const reply of replies) {
      if (reply.snippet?.authorChannelId?.value === channelId) {
        const replyId = reply.id!;
        // Store it for future use
        await db.execute({
          sql: `UPDATE youtube_comments SET owner_reply_youtube_id = ? WHERE id = ? AND user_id = ?`,
          args: [replyId, commentDbId, userId],
        });
        console.log(`[CommentReplier] Found & cached reply ID: ${replyId}`);
        return replyId;
      }
    }
  } catch (err) {
    console.error("[CommentReplier] Fallback lookup failed:", err instanceof Error ? err.message : err);
  }

  throw new Error("Could not find your reply on YouTube. It may have already been deleted.");
}

/**
 * Delete a reply comment from YouTube.
 * Uses youtube.comments.delete() — only works for comments posted by the authenticated user.
 */
export async function deleteReplyFromYouTube(
  userId: string,
  youtubeCommentId: string,
  commentDbId: string
): Promise<{ deleted: boolean }> {
  const replyId = await resolveYouTubeReplyId(userId, commentDbId, youtubeCommentId);

  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  await youtube.comments.delete({ id: replyId });
  console.log(`[CommentReplier] 🗑️ Deleted YouTube comment ${replyId}`);

  // Update local DB
  await db.execute({
    sql: `UPDATE youtube_comments SET owner_replied = 0, owner_reply_text = NULL, owner_reply_at = NULL, owner_reply_youtube_id = NULL WHERE id = ? AND user_id = ?`,
    args: [commentDbId, userId],
  });

  return { deleted: true };
}

/**
 * Edit/update a reply comment on YouTube.
 * Uses youtube.comments.update() — only works for comments posted by the authenticated user.
 */
export async function editReplyOnYouTube(
  userId: string,
  youtubeCommentId: string,
  commentDbId: string,
  newText: string
): Promise<{ updated: boolean; youtubeCommentId: string }> {
  const replyId = await resolveYouTubeReplyId(userId, commentDbId, youtubeCommentId);

  const oauth2Client = await getAuthenticatedYouTubeClient(userId);
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  await youtube.comments.update({
    part: ["snippet"],
    requestBody: {
      id: replyId,
      snippet: {
        textOriginal: newText,
      },
    },
  });

  console.log(`[CommentReplier] ✏️ Edited YouTube comment ${replyId}`);

  // Update local DB
  await db.execute({
    sql: `UPDATE youtube_comments SET owner_reply_text = ?, owner_reply_at = datetime('now') WHERE id = ? AND user_id = ?`,
    args: [newText, commentDbId, userId],
  });

  return { updated: true, youtubeCommentId: replyId };
}

/**
 * Generate an AI reply AND optionally post it to YouTube.
 * Also records the reply in the local DB for tracking.
 */
export async function replyToComment(
  userId: string,
  commentDbId: string,
  parentCommentId: string,
  commentText: string,
  authorName: string,
  postToYouTube: boolean = false,
  customReplyText?: string,
  customInstruction?: string
): Promise<GeneratedReply> {
  // Generate or use provided reply text
  const replyText = customReplyText || await generateAIReply(userId, commentText, authorName, customInstruction);

  let youtubeReplyId: string | undefined;
  let posted = false;

  // Post to YouTube if requested
  if (postToYouTube) {
    try {
      const result = await postReplyToYouTube(userId, parentCommentId, replyText);
      youtubeReplyId = result.youtubeReplyId;
      posted = true;
    } catch (err) {
      console.error("[CommentReplier] Failed to post to YouTube:", err instanceof Error ? err.message : err);
      // Don't throw — still return the generated reply even if posting fails
    }
  }

  // Record in local DB (including youtube reply ID)
  try {
    await db.execute({
      sql: `UPDATE youtube_comments SET owner_replied = 1, owner_reply_text = ?, owner_reply_at = datetime('now'), owner_reply_youtube_id = ? WHERE id = ? AND user_id = ?`,
      args: [replyText, youtubeReplyId || null, commentDbId, userId],
    });
  } catch {
    // Best-effort DB update
  }

  return {
    commentId: commentDbId,
    replyText,
    postedToYouTube: posted,
    youtubeReplyId,
  };
}

// ─── Auto-Reply Engine ───────────────────────────────────────────────────────

/**
 * Run auto-reply on unreplied comments matching the creator's filter criteria.
 * Returns all generated replies.
 */
export async function runAutoReply(
  userId: string,
  videoId?: string,
  postToYouTube: boolean = false
): Promise<{ repliesGenerated: number; repliesPosted: number; replies: GeneratedReply[] }> {
  const settings = await getCreatorReplySettings(userId);

  if (!settings.autoReplyEnabled && !videoId) {
    return { repliesGenerated: 0, repliesPosted: 0, replies: [] };
  }

  // Build sentiment filter based on settings
  const sentimentFilters: string[] = [];
  if (settings.replyToPositive) sentimentFilters.push("'positive'", "'mixed'");
  if (settings.replyToNegative) sentimentFilters.push("'negative'", "'mixed'");
  if (settings.replyToQuestions) sentimentFilters.push("'neutral'"); // Questions often classified as neutral
  if (settings.replyToNeutral) sentimentFilters.push("'neutral'");

  // Deduplicate
  const uniqueFilters = [...new Set(sentimentFilters)];
  if (uniqueFilters.length === 0) {
    return { repliesGenerated: 0, repliesPosted: 0, replies: [] };
  }

  // Fetch unreplied comments WITH video title via JOIN
  let sql = `SELECT c.id, c.comment_id, c.text_original, c.author_name, c.video_id, c.sentiment,
                    v.title as video_title
             FROM youtube_comments c
             LEFT JOIN youtube_videos v ON c.video_id = v.video_id AND c.user_id = v.user_id
             WHERE c.user_id = ? AND c.is_reply = 0 AND (c.owner_replied IS NULL OR c.owner_replied = 0)
             AND c.sentiment IN (${uniqueFilters.join(",")})`;
  const args: unknown[] = [userId];

  if (videoId) {
    sql += " AND c.video_id = ?";
    args.push(videoId);
  }

  sql += ` ORDER BY c.like_count DESC LIMIT ?`;
  args.push(settings.maxRepliesPerRun);

  const result = await db.execute({ sql, args });
  const comments = result.rows;

  if (comments.length === 0) {
    return { repliesGenerated: 0, repliesPosted: 0, replies: [] };
  }

  console.log(`[AutoReply] Processing ${comments.length} unreplied comments for user ${userId.substring(0, 8)}...`);

  const replies: GeneratedReply[] = [];
  let repliesPosted = 0;

  for (const comment of comments) {
    try {
      const reply = await replyToComment(
        userId,
        comment.id as string,
        comment.comment_id as string,
        comment.text_original as string,
        comment.author_name as string,
        postToYouTube,
        undefined,
        settings.creatorContext
      );

      // Enrich with video + comment context
      reply.videoId = comment.video_id as string;
      reply.videoTitle = (comment.video_title as string) || "Unknown Video";
      reply.originalComment = comment.text_original as string;
      reply.originalAuthor = comment.author_name as string;
      reply.sentiment = comment.sentiment as string;

      replies.push(reply);
      if (reply.postedToYouTube) repliesPosted++;

      // Small delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.warn(`[AutoReply] Failed for comment ${comment.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[AutoReply] ✅ Generated ${replies.length} replies, posted ${repliesPosted} to YouTube`);
  return { repliesGenerated: replies.length, repliesPosted, replies };
}
