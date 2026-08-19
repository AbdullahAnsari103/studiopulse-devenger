// ─── Provider Constants ─────────────────────────────────────────────────────
// Centralized provider name constants to avoid string duplication.
// Import from here instead of hardcoding platform strings.

export const PROVIDERS = {
  YOUTUBE: "youtube",
  META: "meta",
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
  TWITTER: "twitter",
} as const;

export type ProviderName = (typeof PROVIDERS)[keyof typeof PROVIDERS];
