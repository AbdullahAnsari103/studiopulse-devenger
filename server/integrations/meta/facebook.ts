/**
 * Facebook Domain Logic & Profile Helper
 *
 * Dedicated domain helper for Facebook user and Page metadata operations.
 * Uses `metaClient` for all Graph API communication.
 *
 * Extension Points:
 *   // Phase 2: Page Insights (impressions, engagement, reach, video views)
 *   // Phase 3: Page Post Publishing & Media Uploads
 *   // Phase 4: Page Comment Moderation & Messaging
 */

import { metaClient } from "./client";
import type { MetaUserProfile } from "./types";

/**
 * Fetch the authenticated user's Facebook profile metadata.
 */
export async function fetchUserProfile(userAccessToken: string): Promise<MetaUserProfile> {
  console.log("[Facebook Domain] Fetching user profile...");
  return metaClient.get<MetaUserProfile>("/me", userAccessToken, {
    fields: "id,name,email,picture{url}",
  });
}

// ─── Phase 2 Extension Points ────────────────────────────────────────────────
// export async function fetchPageInsights(pageId: string, pageAccessToken: string) { ... }
// export async function fetchPagePosts(pageId: string, pageAccessToken: string) { ... }

// ─── Phase 3 Extension Points ────────────────────────────────────────────────
// export async function publishPagePost(pageId: string, pageAccessToken: string, payload: unknown) { ... }
