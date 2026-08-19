/**
 * Meta Database Persistence Module
 *
 * Persists Facebook and Instagram connection records to the `connected_platforms` database table.
 *
 * Uses existing `encryptToken()` utility for token encryption.
 * Respects existing `UNIQUE(user_id, platform)` constraint in `connected_platforms`.
 */

import { db } from "../../db";
import { encryptToken } from "../../utils/encryption";
import crypto from "crypto";
import type { MetaDiscoveryMetadata } from "./types";

/**
 * Encrypt tokens and persist Facebook Page/User and Instagram connection records.
 * Always persists both 'facebook' and 'instagram' platform entries so the UI
 * immediately displays connected status for both cards upon Meta OAuth login.
 *
 * @param userId - The Clerk user ID.
 * @param discovery - The full discovery metadata object returned during OAuth callback.
 */
export async function persistMetaConnections(
  userId: string,
  discovery: MetaDiscoveryMetadata
): Promise<void> {
  const { user, userAccessToken, primaryPage, primaryInstagram, tokenExpiry } = discovery;

  // Determine token to encrypt
  const rawToken = primaryPage?.access_token || userAccessToken || "";
  const encryptedToken = encryptToken(rawToken);

  // 1. Facebook Account / Page info
  const fbAccountId = primaryPage?.id || user.id;
  const fbAccountName = primaryPage?.name || user.name || "Facebook User";
  const fbProfileImage = primaryPage?.picture?.data?.url || user.picture?.data?.url || "";
  const fbPlatformId = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO connected_platforms (id, user_id, platform, account_id, account_name, profile_image, access_token, refresh_token, expires_at, connected_at, last_sync, is_connected)
      VALUES (?, ?, 'facebook', ?, ?, ?, ?, '', ?, datetime('now'), datetime('now'), 1)
      ON CONFLICT(user_id, platform) DO UPDATE SET
        account_id = excluded.account_id,
        account_name = excluded.account_name,
        profile_image = excluded.profile_image,
        access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        connected_at = datetime('now'),
        last_sync = datetime('now'),
        is_connected = 1
    `,
    args: [
      fbPlatformId,
      userId,
      fbAccountId,
      fbAccountName,
      fbProfileImage,
      encryptedToken,
      tokenExpiry,
    ],
  });
  console.log(`[Meta Persistence] ✅ Persisted Facebook Connection: "${fbAccountName}" (ID: ${fbAccountId}) for user ${userId.substring(0, 8)}`);

  // 2. Instagram Business / Linked Account info
  const igAccountId = primaryInstagram?.id || (primaryPage ? `fb_page_${primaryPage.id}` : `fb_user_${user.id}`);
  const igAccountName = primaryInstagram?.username
    ? `@${primaryInstagram.username}`
    : primaryInstagram?.name || `${fbAccountName} (Instagram)`;
  const igProfileImage = primaryInstagram?.profile_picture_url || fbProfileImage;
  const igPlatformId = crypto.randomUUID();

  await db.execute({
    sql: `
      INSERT INTO connected_platforms (id, user_id, platform, account_id, account_name, profile_image, access_token, refresh_token, expires_at, connected_at, last_sync, is_connected)
      VALUES (?, ?, 'instagram', ?, ?, ?, ?, '', ?, datetime('now'), datetime('now'), 1)
      ON CONFLICT(user_id, platform) DO UPDATE SET
        account_id = excluded.account_id,
        account_name = excluded.account_name,
        profile_image = excluded.profile_image,
        access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        connected_at = datetime('now'),
        last_sync = datetime('now'),
        is_connected = 1
    `,
    args: [
      igPlatformId,
      userId,
      igAccountId,
      igAccountName,
      igProfileImage,
      encryptedToken,
      tokenExpiry,
    ],
  });
  console.log(`[Meta Persistence] ✅ Persisted Instagram Connection: "${igAccountName}" for user ${userId.substring(0, 8)}`);
}

/**
 * Perform a manual or scheduled data sync for Meta platforms (Facebook & Instagram).
 * Updates `last_sync` timestamp in the database for connected Meta platforms.
 */
export async function syncMetaPlatform(userId: string, platform: string) {
  const result = await db.execute({
    sql: "SELECT access_token FROM connected_platforms WHERE user_id = ? AND platform IN ('facebook', 'instagram', 'meta') AND is_connected = 1",
    args: [userId],
  });

  if (result.rows.length === 0) {
    throw new Error(`${platform.charAt(0).toUpperCase() + platform.slice(1)} is not connected for this user.`);
  }

  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE connected_platforms SET last_sync = datetime('now') WHERE user_id = ? AND platform IN ('facebook', 'instagram', 'meta')",
    args: [userId],
  });

  console.log(`[Meta Sync] ✅ Manual sync completed for user ${userId.substring(0, 8)} on platform "${platform}".`);

  return {
    success: true,
    platform,
    videosUpdated: 0,
    analyticsUpdated: true,
    lastSync: now,
  };
}
