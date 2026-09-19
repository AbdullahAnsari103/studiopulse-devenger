/**
 * Smart Tone Analyzer — Creator Voice Profile Engine
 * 
 * Analyzes the creator's past manual replies to learn their unique voice:
 * - Formality level (casual / balanced / formal)
 * - Emoji usage patterns (none / sparse / moderate / heavy)
 * - Average reply length (short / medium / long)
 * - Whether they ask follow-up questions
 * - Whether they use humor / sarcasm / wit
 * - Language style (English, Hinglish, regional mix)
 * 
 * The profile is cached in the `tone_profiles` table and injected
 * into the AI system prompt when generating replies, making every
 * AI-generated response sound like the creator — not a generic chatbot.
 */

import { callGemini } from "../ai/gemini";
import { db } from "../db";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToneProfile {
  toneSummary: string;
  formality: "casual" | "balanced" | "formal";
  emojiUsage: "none" | "sparse" | "moderate" | "heavy";
  avgReplyLength: "short" | "medium" | "long";
  asksFollowups: boolean;
  usesHumor: boolean;
  languageStyle: string;
  sampleReplies: string[];
  analyzedReplyCount: number;
  updatedAt: string;
}

// ─── Fetch Past Manual Replies ───────────────────────────────────────────────

/**
 * Retrieve the creator's last N manual (human-written) replies from the DB.
 * These are replies where `owner_replied = 1` and `owner_reply_text IS NOT NULL`.
 * We pair each reply with its original viewer comment for context.
 */
async function fetchCreatorPastReplies(
  userId: string,
  limit: number = 20
): Promise<{ viewerComment: string; creatorReply: string }[]> {
  const result = await db.execute({
    sql: `SELECT text_original, owner_reply_text
          FROM youtube_comments
          WHERE user_id = ?
            AND owner_replied = 1
            AND owner_reply_text IS NOT NULL
            AND owner_reply_text != ''
          ORDER BY owner_reply_at DESC
          LIMIT ?`,
    args: [userId, limit],
  });

  return result.rows
    .filter((r) => r.owner_reply_text && r.text_original)
    .map((r) => ({
      viewerComment: r.text_original as string,
      creatorReply: r.owner_reply_text as string,
    }));
}

// ─── AI-Powered Tone Analysis ────────────────────────────────────────────────

/**
 * Send the creator's past replies to the AI and extract a structured tone profile.
 */
async function analyzeToneFromReplies(
  pairs: { viewerComment: string; creatorReply: string }[]
): Promise<ToneProfile> {
  const examples = pairs
    .map(
      (p, i) =>
        `Example ${i + 1}:\n  Viewer: "${p.viewerComment}"\n  Creator Reply: "${p.creatorReply}"`
    )
    .join("\n\n");

  const systemPrompt = `You are a linguistic tone analyzer. Given a set of real comment-reply pairs written by a content creator, analyze their unique communication style and return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "toneSummary": "A 2-3 sentence description of how this creator communicates. Mention specific patterns like greetings, sign-offs, catchphrases, or recurring expressions they use.",
  "formality": "casual" | "balanced" | "formal",
  "emojiUsage": "none" | "sparse" | "moderate" | "heavy",
  "avgReplyLength": "short" | "medium" | "long",
  "asksFollowups": true/false,
  "usesHumor": true/false,
  "languageStyle": "Describe the language mix, e.g. 'English', 'Hinglish (Hindi-English mix)', 'casual English with Hindi slang', etc."
}

Definitions:
- formality: "casual" = slang, abbreviations, no caps. "balanced" = proper grammar but friendly. "formal" = corporate, polished.
- emojiUsage: "none" = zero emojis. "sparse" = 1 emoji per 3-4 replies. "moderate" = 1-2 per reply. "heavy" = 3+ per reply.
- avgReplyLength: "short" = 1-15 words. "medium" = 15-40 words. "long" = 40+ words.
- asksFollowups: Does the creator frequently end with a question back to the viewer?
- usesHumor: Does the creator use jokes, wit, sarcasm, or playful teasing?

IMPORTANT: Return ONLY the raw JSON object. No explanation, no markdown fences.`;

  const userMessage = `Analyze these ${pairs.length} real comment-reply pairs from a content creator:\n\n${examples}`;

  try {
    const response = await callGemini(systemPrompt, userMessage);
    // Clean up response — strip markdown fences if present
    const cleaned = response
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      toneSummary: parsed.toneSummary || "Conversational and friendly.",
      formality: parsed.formality || "casual",
      emojiUsage: parsed.emojiUsage || "moderate",
      avgReplyLength: parsed.avgReplyLength || "short",
      asksFollowups: Boolean(parsed.asksFollowups),
      usesHumor: Boolean(parsed.usesHumor),
      languageStyle: parsed.languageStyle || "English",
      sampleReplies: pairs.slice(0, 5).map((p) => p.creatorReply),
      analyzedReplyCount: pairs.length,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[ToneAnalyzer] AI analysis failed, using heuristic fallback:", err);
    return heuristicToneAnalysis(pairs);
  }
}

/**
 * Fallback: If AI analysis fails, use simple heuristics to build a basic profile.
 */
function heuristicToneAnalysis(
  pairs: { viewerComment: string; creatorReply: string }[]
): ToneProfile {
  const replies = pairs.map((p) => p.creatorReply);
  const allText = replies.join(" ");

  // Emoji count
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const totalEmojis = (allText.match(emojiRegex) || []).length;
  const emojiPerReply = totalEmojis / replies.length;

  let emojiUsage: ToneProfile["emojiUsage"] = "none";
  if (emojiPerReply > 2.5) emojiUsage = "heavy";
  else if (emojiPerReply > 0.8) emojiUsage = "moderate";
  else if (emojiPerReply > 0.2) emojiUsage = "sparse";

  // Average length
  const avgWords = replies.reduce((sum, r) => sum + r.split(/\s+/).length, 0) / replies.length;
  let avgReplyLength: ToneProfile["avgReplyLength"] = "short";
  if (avgWords > 40) avgReplyLength = "long";
  else if (avgWords > 15) avgReplyLength = "medium";

  // Follows up with questions
  const questionReplies = replies.filter((r) => r.includes("?")).length;
  const asksFollowups = questionReplies / replies.length > 0.3;

  // Formality — check for exclamation marks, slang indicators
  const exclamations = (allText.match(/!/g) || []).length;
  const hasSlang = /\b(lol|haha|bro|yoo|nah|gonna|wanna|omg|btw|ikr)\b/i.test(allText);
  let formality: ToneProfile["formality"] = "balanced";
  if (hasSlang || exclamations / replies.length > 1.5) formality = "casual";

  // Humor — very basic check
  const humorIndicators = /\b(lol|haha|😂|🤣|😅|jk|joke|lmao)\b/i.test(allText);

  // Language — check for Hindi/Hinglish
  const hindiIndicators = /\b(bhai|yaar|kya|hai|nahi|acha|bohot|bahut|matlab|arre)\b/i.test(allText);
  const languageStyle = hindiIndicators ? "Hinglish (Hindi-English mix)" : "English";

  return {
    toneSummary: `Creator uses a ${formality} tone with ${emojiUsage} emoji usage. Average replies are ${avgReplyLength} in length. ${asksFollowups ? "Often asks follow-up questions." : "Rarely asks follow-up questions."} ${humorIndicators ? "Uses humor and casual expressions." : "Straightforward and direct."}`,
    formality,
    emojiUsage,
    avgReplyLength,
    asksFollowups,
    usesHumor: humorIndicators,
    languageStyle,
    sampleReplies: replies.slice(0, 5),
    analyzedReplyCount: pairs.length,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Profile Persistence ─────────────────────────────────────────────────────

/**
 * Save/update the tone profile in the database cache.
 */
async function saveToneProfile(userId: string, profile: ToneProfile): Promise<void> {
  await db.execute({
    sql: `INSERT INTO tone_profiles (id, user_id, tone_summary, formality, emoji_usage, avg_reply_length, asks_followups, uses_humor, language_style, sample_replies, analyzed_reply_count, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            tone_summary = excluded.tone_summary,
            formality = excluded.formality,
            emoji_usage = excluded.emoji_usage,
            avg_reply_length = excluded.avg_reply_length,
            asks_followups = excluded.asks_followups,
            uses_humor = excluded.uses_humor,
            language_style = excluded.language_style,
            sample_replies = excluded.sample_replies,
            analyzed_reply_count = excluded.analyzed_reply_count,
            updated_at = datetime('now')`,
    args: [
      crypto.randomUUID(),
      userId,
      profile.toneSummary,
      profile.formality,
      profile.emojiUsage,
      profile.avgReplyLength,
      profile.asksFollowups ? 1 : 0,
      profile.usesHumor ? 1 : 0,
      profile.languageStyle,
      JSON.stringify(profile.sampleReplies),
      profile.analyzedReplyCount,
    ],
  });

  console.log(`[ToneAnalyzer] ✅ Saved tone profile for user ${userId.substring(0, 8)}... (${profile.analyzedReplyCount} replies analyzed)`);
}

/**
 * Load cached tone profile from DB. Returns null if none exists.
 */
async function loadCachedToneProfile(userId: string): Promise<ToneProfile | null> {
  const result = await db.execute({
    sql: "SELECT * FROM tone_profiles WHERE user_id = ?",
    args: [userId],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  let sampleReplies: string[] = [];
  try {
    sampleReplies = JSON.parse((row.sample_replies as string) || "[]");
  } catch {
    sampleReplies = [];
  }

  return {
    toneSummary: (row.tone_summary as string) || "Conversational and authentic creator voice.",
    formality: (row.formality as ToneProfile["formality"]) || "casual",
    emojiUsage: (row.emoji_usage as ToneProfile["emojiUsage"]) || "moderate",
    avgReplyLength: (row.avg_reply_length as ToneProfile["avgReplyLength"]) || "short",
    asksFollowups: Number(row.asks_followups) === 1,
    usesHumor: Number(row.uses_humor) === 1,
    languageStyle: (row.language_style as string) || "English",
    sampleReplies,
    analyzedReplyCount: Number(row.analyzed_reply_count) || 0,
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the creator's tone profile. Uses cached version if available,
 * otherwise analyzes past replies and caches the result.
 * Pass `forceRefresh = true` to re-analyze even if a cached profile exists.
 */
export async function getCreatorToneProfile(
  userId: string,
  forceRefresh: boolean = false
): Promise<{ profile: ToneProfile | null; manualRepliesCount: number }> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await loadCachedToneProfile(userId);
    if (cached) {
      return { profile: cached, manualRepliesCount: cached.analyzedReplyCount };
    }
  }

  // Fetch past replies
  const pairs = await fetchCreatorPastReplies(userId, 25);

  if (pairs.length < 3) {
    console.log(`[ToneAnalyzer] Only ${pairs.length} past replies found for user ${userId.substring(0, 8)}... — need at least 3 to auto-build profile.`);
    return { profile: null, manualRepliesCount: pairs.length };
  }

  console.log(`[ToneAnalyzer] Analyzing ${pairs.length} past replies for user ${userId.substring(0, 8)}...`);

  // Run AI analysis
  const profile = await analyzeToneFromReplies(pairs);

  // Cache it
  await saveToneProfile(userId, profile);

  return { profile, manualRepliesCount: pairs.length };
}

/**
 * Manually update or customize the creator's tone profile.
 */
export async function updateCreatorToneProfile(
  userId: string,
  updates: Partial<ToneProfile>
): Promise<ToneProfile> {
  const existing = await loadCachedToneProfile(userId);
  const baseProfile: ToneProfile = existing || {
    toneSummary: "Engaging and authentic YouTube creator voice.",
    formality: "casual",
    emojiUsage: "moderate",
    avgReplyLength: "short",
    asksFollowups: false,
    usesHumor: true,
    languageStyle: "English",
    sampleReplies: [],
    analyzedReplyCount: 0,
    updatedAt: new Date().toISOString(),
  };

  const updated: ToneProfile = {
    ...baseProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveToneProfile(userId, updated);
  return updated;
}

/**
 * Generate the tone instruction block to inject into the AI reply system prompt.
 * Returns an empty string if no profile exists yet.
 */
export async function getToneInstructionForPrompt(userId: string): Promise<string> {
  const res = await getCreatorToneProfile(userId);
  const profile = res.profile;

  if (!profile) {
    return "";
  }

  const sampleBlock = profile.sampleReplies && profile.sampleReplies.length > 0
    ? `\nHere are real examples of how this creator actually replies:\n${profile.sampleReplies.map((r, i) => `  ${i + 1}. "${r}"`).join("\n")}`
    : "";

  return `
=== CREATOR VOICE PROFILE (CRITICAL — MATCH THIS STYLE) ===
${profile.toneSummary}

Voice characteristics to match:
- Formality: ${profile.formality} (${profile.formality === "casual" ? "use contractions, slang, abbreviations" : profile.formality === "formal" ? "use proper grammar, no slang" : "friendly but grammatically correct"})
- Emoji style: ${profile.emojiUsage} (${profile.emojiUsage === "none" ? "do NOT use any emojis" : profile.emojiUsage === "sparse" ? "use at most 1 emoji occasionally" : profile.emojiUsage === "moderate" ? "use 1-2 emojis naturally" : "use 2-3+ emojis freely"})
- Reply length: ${profile.avgReplyLength} (${profile.avgReplyLength === "short" ? "keep replies to 1-15 words" : profile.avgReplyLength === "medium" ? "aim for 15-40 words" : "can write 40+ words when appropriate"})
- Follow-up questions: ${profile.asksFollowups ? "YES — this creator often ends with a question back to the viewer" : "NO — this creator rarely asks questions back"}
- Humor: ${profile.usesHumor ? "YES — feel free to be witty, playful, or use light humor" : "NO — keep it genuine and straightforward, no forced jokes"}
- Language: ${profile.languageStyle}
${sampleBlock}
=== END VOICE PROFILE ===`;
}

/**
 * Generate a side-by-side comparison:
 * 1. Generic AI Reply (without voice clone)
 * 2. Cloned Voice Reply (matching creator's learned voice)
 */
export async function generateToneComparison(
  userId: string,
  commentText: string,
  authorName: string = "Viewer"
): Promise<{ genericReply: string; personalizedReply: string; profile: ToneProfile | null }> {
  const { profile } = await getCreatorToneProfile(userId);
  const toneInstruction = await getToneInstructionForPrompt(userId);

  // 1. Generic AI prompt (standard chatbot)
  const genericPrompt = `You are a generic customer service chatbot replying to a YouTube comment. Write a polite, standard, generic reply (2-3 sentences).
Do NOT include quotes or prefixes. Just the raw reply text.`;

  // 2. Personalized AI prompt (with creator's voice clone)
  const personalizedPrompt = `You are a YouTube creator replying to a viewer's comment on your video.
${toneInstruction || "Write a warm, authentic, conversational reply."}
Rules:
- Write in the creator's exact voice style.
- Reply ONLY with the response text. No quotes, no prefix.`;

  const userMessage = `Viewer "${authorName}" commented: "${commentText}"`;

  const [genericReply, personalizedReply] = await Promise.all([
    callGemini(genericPrompt, userMessage)
      .then((r) => r.replace(/^["']|["']$/g, "").trim())
      .catch(() => `Thank you for your comment, ${authorName}. We appreciate your support and feedback.`),
    callGemini(personalizedPrompt, userMessage)
      .then((r) => r.replace(/^["']|["']$/g, "").trim())
      .catch(() => `Thanks for watching and sharing your thoughts, ${authorName}! 🙌`),
  ]);

  return {
    genericReply,
    personalizedReply,
    profile,
  };
}
