/**
 * Centralized Meta Configuration Module
 *
 * Exposes all environment variables and API scopes for Meta (Facebook & Instagram)
 * Graph API integrations. No other Meta module reads process.env directly.
 */

export const metaConfig = {
  /** Meta App ID (from Meta Developer Dashboard) */
  appId: process.env.META_APP_ID || "",

  /** Meta App Secret */
  appSecret: process.env.META_APP_SECRET || "",

  /** Optional Meta Configuration ID for Facebook Login for Business */
  configId: process.env.META_CONFIG_ID || "",

  /** OAuth redirect URI */
  redirectUri:
    process.env.META_REDIRECT_URI || "http://localhost:3001/api/platforms/meta/callback",

  /** Meta Graph API version */
  apiVersion: process.env.META_API_VERSION || "v21.0",

  /** Base URL for Meta Graph API calls */
  get graphBaseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}`;
  },

  /** OAuth scopes requested during Facebook/Instagram Login */
  scopes: [
    "public_profile",
    "pages_show_list",
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "instagram_manage_messages",
  ],
};
