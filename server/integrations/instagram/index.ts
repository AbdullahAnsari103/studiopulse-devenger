/**
 * Instagram Integration — Provider stub.
 *
 * When INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are set in .env,
 * the Instagram Graph API integration will activate automatically.
 *
 * Required environment variables:
 *   INSTAGRAM_APP_ID=
 *   INSTAGRAM_APP_SECRET=
 *   INSTAGRAM_REDIRECT_URI=http://localhost:3001/api/platforms/instagram/callback
 *
 * Instagram Graph API scopes:
 *   - instagram_basic
 *   - instagram_content_publish
 *   - instagram_manage_insights
 *   - pages_show_list
 *   - pages_read_engagement
 */

export function isInstagramConfigured(): boolean {
  return !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function getInstagramAuthUrl(userId: string): string {
  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3001/api/platforms/instagram/callback";
  return `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish,instagram_manage_insights&response_type=code&state=${userId}`;
}

// Additional methods (handleCallback, disconnect, sync, upload, analytics)
// will follow the same pattern as youtube/ once credentials are provided.
