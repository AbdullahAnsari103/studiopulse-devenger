/**
 * Facebook Integration — Provider stub.
 *
 * When FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are set in .env,
 * the Facebook API integration will activate automatically.
 *
 * Required environment variables:
 *   FACEBOOK_APP_ID=
 *   FACEBOOK_APP_SECRET=
 *   FACEBOOK_REDIRECT_URI=http://localhost:3001/api/platforms/facebook/callback
 *
 * Facebook Graph API permissions:
 *   - pages_show_list
 *   - pages_read_engagement
 *   - pages_manage_posts
 *   - read_insights
 */

export function isFacebookConfigured(): boolean {
  return !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

export function getFacebookAuthUrl(userId: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || "http://localhost:3001/api/platforms/facebook/callback";
  return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,read_insights&state=${userId}`;
}
