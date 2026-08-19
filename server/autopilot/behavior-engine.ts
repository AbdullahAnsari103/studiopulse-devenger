/**
 * Behavioral Engine
 * Records user upload/publish patterns and provides smart suggestions
 * for platform selection and video type defaults.
 */

import { db } from "../db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BehaviorProfile {
  userId: string;
  videoTypeHistory: Record<string, number>;   // e.g. {"music_video": 12, "tutorial": 5}
  platformPreferences: Record<string, number>; // e.g. {"youtube": 18, "instagram": 3}
  avgUploadHour: number;
  preferredVisibility: string;
  totalUploads: number;
  totalPublishes: number;
  lastUploadAt: string | null;
  lastPublishAt: string | null;
  suggestedPlatforms: string[];
  suggestedVideoType: string | null;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Ensure a behavior profile row exists for this user.
 */
async function ensureProfile(userId: string): Promise<void> {
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_behavior_profile (user_id) VALUES (?)`,
    args: [userId],
  });
}

/**
 * Get the user's behavior profile with smart suggestions.
 */
export async function getUserBehaviorProfile(userId: string): Promise<BehaviorProfile> {
  await ensureProfile(userId);

  const result = await db.execute({
    sql: `SELECT * FROM user_behavior_profile WHERE user_id = ?`,
    args: [userId],
  });

  const row = result.rows[0];
  if (!row) {
    return {
      userId,
      videoTypeHistory: {},
      platformPreferences: {},
      avgUploadHour: 12,
      preferredVisibility: "public",
      totalUploads: 0,
      totalPublishes: 0,
      lastUploadAt: null,
      lastPublishAt: null,
      suggestedPlatforms: ["youtube"],
      suggestedVideoType: null,
    };
  }

  const videoTypeHistory = safeParseJSON<Record<string, number>>(row.video_type_history as string, {});
  const platformPreferences = safeParseJSON<Record<string, number>>(row.platform_preferences as string, {});

  return {
    userId,
    videoTypeHistory,
    platformPreferences,
    avgUploadHour: (row.avg_upload_hour as number) || 12,
    preferredVisibility: (row.preferred_visibility as string) || "public",
    totalUploads: (row.total_uploads as number) || 0,
    totalPublishes: (row.total_publishes as number) || 0,
    lastUploadAt: row.last_upload_at as string | null,
    lastPublishAt: row.last_publish_at as string | null,
    suggestedPlatforms: getSuggestedPlatforms(platformPreferences),
    suggestedVideoType: getSuggestedVideoType(videoTypeHistory),
  };
}

/**
 * Record behavior when user uploads videos.
 */
export async function recordUploadBehavior(
  userId: string,
  videoType: string,
  platforms: string[],
  visibility: string = "public"
): Promise<void> {
  await ensureProfile(userId);

  const profile = await db.execute({
    sql: `SELECT video_type_history, platform_preferences, total_uploads, avg_upload_hour FROM user_behavior_profile WHERE user_id = ?`,
    args: [userId],
  });

  const row = profile.rows[0];
  const videoTypeHistory = safeParseJSON<Record<string, number>>(row?.video_type_history as string, {});
  const platformPrefs = safeParseJSON<Record<string, number>>(row?.platform_preferences as string, {});
  const currentUploads = (row?.total_uploads as number) || 0;
  const currentAvgHour = (row?.avg_upload_hour as number) || 12;

  // Increment video type count
  if (videoType) {
    videoTypeHistory[videoType] = (videoTypeHistory[videoType] || 0) + 1;
  }

  // Increment platform counts
  for (const p of platforms) {
    platformPrefs[p] = (platformPrefs[p] || 0) + 1;
  }

  // Running average of upload hour
  const currentHour = new Date().getHours();
  const newAvgHour = Math.round((currentAvgHour * currentUploads + currentHour) / (currentUploads + 1));

  await db.execute({
    sql: `UPDATE user_behavior_profile SET
          video_type_history = ?,
          platform_preferences = ?,
          avg_upload_hour = ?,
          preferred_visibility = ?,
          total_uploads = total_uploads + 1,
          last_upload_at = datetime('now'),
          updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [
      JSON.stringify(videoTypeHistory),
      JSON.stringify(platformPrefs),
      newAvgHour,
      visibility,
      userId,
    ],
  });

  console.log(`[BehaviorEngine] Recorded upload for user ${userId.substring(0, 8)}... type=${videoType} platforms=${platforms.join(",")}`);
}

/**
 * Record behavior when a video is successfully published.
 */
export async function recordPublishBehavior(
  userId: string,
  platform: string,
  videoType?: string
): Promise<void> {
  await ensureProfile(userId);

  const profile = await db.execute({
    sql: `SELECT platform_preferences, video_type_history FROM user_behavior_profile WHERE user_id = ?`,
    args: [userId],
  });

  const row = profile.rows[0];
  const platformPrefs = safeParseJSON<Record<string, number>>(row?.platform_preferences as string, {});
  const videoTypeHistory = safeParseJSON<Record<string, number>>(row?.video_type_history as string, {});

  // Boost platform preference (publishes count more than uploads)
  platformPrefs[platform] = (platformPrefs[platform] || 0) + 2;

  // Boost video type if provided
  if (videoType) {
    videoTypeHistory[videoType] = (videoTypeHistory[videoType] || 0) + 1;
  }

  await db.execute({
    sql: `UPDATE user_behavior_profile SET
          platform_preferences = ?,
          video_type_history = ?,
          total_publishes = total_publishes + 1,
          last_publish_at = datetime('now'),
          updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [
      JSON.stringify(platformPrefs),
      JSON.stringify(videoTypeHistory),
      userId,
    ],
  });

  console.log(`[BehaviorEngine] Recorded publish for user ${userId.substring(0, 8)}... platform=${platform}`);
}

// ─── Suggestion Helpers ──────────────────────────────────────────────────────

/**
 * Rank platforms by usage frequency — returns top platforms.
 */
function getSuggestedPlatforms(prefs: Record<string, number>): string[] {
  const entries = Object.entries(prefs);
  if (entries.length === 0) return ["youtube"];
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([platform]) => platform);
}

/**
 * Get the most frequently used video type.
 */
function getSuggestedVideoType(history: Record<string, number>): string | null {
  const entries = Object.entries(history);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
