/**
 * X (Twitter) Integration — Provider stub.
 *
 * When TWITTER_API_KEY and TWITTER_API_SECRET are set in .env,
 * the X/Twitter API integration will activate automatically.
 *
 * Required environment variables:
 *   TWITTER_API_KEY=
 *   TWITTER_API_SECRET=
 *   TWITTER_REDIRECT_URI=http://localhost:3001/api/platforms/twitter/callback
 *
 * Twitter API v2 scopes:
 *   - tweet.read
 *   - tweet.write
 *   - users.read
 *   - offline.access
 */

export function isTwitterConfigured(): boolean {
  return !!(process.env.TWITTER_API_KEY && process.env.TWITTER_API_SECRET);
}

export function getTwitterAuthUrl(userId: string): string {
  const clientId = process.env.TWITTER_API_KEY;
  const redirectUri = process.env.TWITTER_REDIRECT_URI || "http://localhost:3001/api/platforms/twitter/callback";
  return `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${userId}&code_challenge=challenge&code_challenge_method=plain`;
}
