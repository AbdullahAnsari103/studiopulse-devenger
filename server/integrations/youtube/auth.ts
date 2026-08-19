import { google } from "googleapis";
import { db } from "../../db";
import { encryptToken, decryptToken } from "../../utils/encryption";
import crypto from "crypto";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "http://localhost:3001/api/platforms/youtube/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

function createOAuth2Client() {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error("YouTube OAuth credentials not configured. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.");
  }
  return new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Generate the Google OAuth authorization URL.
 * The `state` parameter carries the userId so we can associate the callback.
 */
export function getYouTubeAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  console.log("[YouTube OAuth] Redirect URI being used:", REDIRECT_URI);
  console.log("[YouTube OAuth] Client ID:", YOUTUBE_CLIENT_ID?.slice(0, 20) + "...");
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId,
    include_granted_scopes: true,
  });
  console.log("[YouTube OAuth] Generated auth URL:", url.slice(0, 120) + "...");
  return url;
}

/**
 * Exchange the authorization code for access and refresh tokens,
 * fetch the channel info, and persist everything to the database.
 */
export async function handleYouTubeCallback(code: string, userId: string) {
  const oauth2Client = createOAuth2Client();

  // Exchange authorization code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch channel info
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });
  const channelResponse = await youtube.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
  });

  const channel = channelResponse.data.items?.[0];
  if (!channel) {
    throw new Error("No YouTube channel found for this account.");
  }

  const accountId = channel.id || "";
  const accountName = channel.snippet?.title || "Unknown Channel";
  const profileImage = channel.snippet?.thumbnails?.default?.url || "";

  // Encrypt tokens before storage
  const encryptedAccess = encryptToken(tokens.access_token || "");
  const encryptedRefresh = encryptToken(tokens.refresh_token || "");
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

  // Upsert connected platform record
  const platformId = crypto.randomUUID();
  await db.execute({
    sql: `
      INSERT INTO connected_platforms (id, user_id, platform, account_id, account_name, profile_image, access_token, refresh_token, expires_at, connected_at, last_sync, is_connected)
      VALUES (?, ?, 'youtube', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)
      ON CONFLICT(user_id, platform) DO UPDATE SET
        account_id = excluded.account_id,
        account_name = excluded.account_name,
        profile_image = excluded.profile_image,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        connected_at = datetime('now'),
        last_sync = datetime('now'),
        is_connected = 1
    `,
    args: [platformId, userId, accountId, accountName, profileImage, encryptedAccess, encryptedRefresh, expiresAt],
  });

  return {
    accountId,
    accountName,
    profileImage,
    platform: "youtube",
  };
}

/**
 * Get a fully authenticated OAuth2 client for a user's YouTube connection.
 * Automatically refreshes the token if it has expired.
 */
export async function getAuthenticatedYouTubeClient(userId: string) {
  const result = await db.execute({
    sql: "SELECT * FROM connected_platforms WHERE user_id = ? AND platform = 'youtube' AND is_connected = 1",
    args: [userId],
  });

  if (result.rows.length === 0) {
    throw new Error("YouTube not connected for this user.");
  }

  const record = result.rows[0];
  const accessToken = decryptToken(record.access_token as string);
  const refreshToken = decryptToken(record.refresh_token as string);

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: record.expires_at ? new Date(record.expires_at as string).getTime() : undefined,
  });

  // Check if token is expired or missing/near expiration (within 60s)
  const tokenInfo = oauth2Client.credentials;
  const needsRefresh = !tokenInfo.expiry_date || tokenInfo.expiry_date <= Date.now() + 60000;

  if (needsRefresh && refreshToken) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Update stored tokens
      const newEncryptedAccess = encryptToken(credentials.access_token || "");
      const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null;
      await db.execute({
        sql: "UPDATE connected_platforms SET access_token = ?, expires_at = ? WHERE user_id = ? AND platform = 'youtube'",
        args: [newEncryptedAccess, newExpiresAt, userId],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[YouTube Auth] Token refresh failed:", msg);
      if (
        msg.includes("invalid_grant") ||
        msg.includes("Token has been expired or revoked") ||
        msg.includes("invalid_request") ||
        msg.includes("unauthorized")
      ) {
        await db.execute({
          sql: "UPDATE connected_platforms SET is_connected = 0 WHERE user_id = ? AND platform = 'youtube'",
          args: [userId],
        });
        throw new Error("YouTube session expired. Please reconnect your YouTube channel.");
      }
      throw err;
    }
  }

  return oauth2Client;
}

/**
 * Helper to handle errors thrown by YouTube API calls.
 * Marks connection as disconnected in DB if invalid_grant or token expired is received.
 */
export async function handleYouTubeApiError(userId: string, error: unknown): Promise<never> {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[YouTube API Error]:", msg);
  if (
    msg.includes("invalid_grant") ||
    msg.includes("Token has been expired or revoked") ||
    msg.includes("invalid_request") ||
    msg.includes("reconnect") ||
    msg.includes("Unauthorized") ||
    msg.includes("insufficient authentication scopes") ||
    msg.includes("insufficientPermissions")
  ) {
    await db.execute({
      sql: "UPDATE connected_platforms SET is_connected = 0 WHERE user_id = ? AND platform = 'youtube'",
      args: [userId],
    });
    throw new Error("YouTube session permissions need update. Please reconnect your YouTube channel to grant full video management access.");
  }
  throw error;
}

/**
 * Disconnect YouTube — revoke tokens and mark as disconnected in the database.
 */
export async function disconnectYouTube(userId: string) {
  const result = await db.execute({
    sql: "SELECT access_token FROM connected_platforms WHERE user_id = ? AND platform = 'youtube' AND is_connected = 1",
    args: [userId],
  });

  if (result.rows.length > 0) {
    try {
      const accessToken = decryptToken(result.rows[0].access_token as string);
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(accessToken);
    } catch {
      // Token may already be invalid — continue with DB cleanup
    }
  }

  await db.execute({
    sql: "UPDATE connected_platforms SET is_connected = 0, access_token = '', refresh_token = '' WHERE user_id = ? AND platform = 'youtube'",
    args: [userId],
  });
}
