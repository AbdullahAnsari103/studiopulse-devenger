/**
 * TikTok Integration — Provider stub.
 *
 * When TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are set in .env,
 * the TikTok API integration will activate automatically.
 *
 * Required environment variables:
 *   TIKTOK_CLIENT_KEY=
 *   TIKTOK_CLIENT_SECRET=
 *   TIKTOK_REDIRECT_URI=http://localhost:3001/api/platforms/tiktok/callback
 *
 * TikTok API scopes:
 *   - user.info.basic
 *   - video.list
 *   - video.upload
 */

export function isTikTokConfigured(): boolean {
  return !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
}

export function getTikTokAuthUrl(userId: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || "http://localhost:3001/api/platforms/tiktok/callback";
  const csrfState = userId;
  return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=user.info.basic,video.list,video.upload&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`;
}
