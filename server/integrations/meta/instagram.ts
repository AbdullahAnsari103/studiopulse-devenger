/**
 * Instagram Domain Logic & Business Account Helper
 *
 * Dedicated domain helper for Instagram Business Account operations.
 * Uses `metaClient` for all Graph API communication.
 *
 * Extension Points:
 *   // Phase 2: Instagram Insights (followers, reach, impressions, media performance)
 *   // Phase 2: Instagram Media & Reels Analytics
 *   // Phase 3: Instagram Photo/Video/Reel/Story Publishing
 *   // Phase 4: Instagram Direct Messages & Comment Moderation
 */

import { metaClient } from "./client";
import type { InstagramBusinessAccount } from "./types";

/**
 * Fetch detailed Instagram Business Account profile metadata.
 *
 * @param igAccountId - The Instagram Business Account ID.
 * @param pageAccessToken - Page access token associated with the linked Facebook Page.
 */
export async function fetchInstagramProfile(
  igAccountId: string,
  pageAccessToken: string
): Promise<InstagramBusinessAccount> {
  console.log(`[Instagram Domain] Fetching profile for IG Account ID: ${igAccountId}...`);
  return metaClient.get<InstagramBusinessAccount>(`/${igAccountId}`, pageAccessToken, {
    fields: "id,username,name,profile_picture_url",
  });
}

// ─── Phase 2 Extension Points ────────────────────────────────────────────────
// export async function fetchInstagramInsights(igAccountId: string, pageAccessToken: string) { ... }
// export async function fetchInstagramMedia(igAccountId: string, pageAccessToken: string) { ... }

// ─── Phase 3 Extension Points ────────────────────────────────────────────────
// export async function publishInstagramMedia(igAccountId: string, pageAccessToken: string, payload: unknown) { ... }
