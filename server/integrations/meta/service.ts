/**
 * Meta High-Level Service Orchestrator
 *
 * Implements the shared `PlatformIntegration` contract. Orchestrates OAuth URL
 * generation, token exchanges, multi-page discovery, database persistence,
 * and builds standardized platform connection results.
 */

import type { PlatformIntegration, StandardPlatformConnectionResult } from "../types";
import { isMetaConfigured, getMetaAuthUrl, exchangeCodeForToken, exchangeForLongLivedToken } from "./auth";
import { fetchUserProfile } from "./facebook";
import { fetchAllPages } from "./pages";
import { persistMetaConnections, syncMetaPlatform } from "./sync";
import type { MetaDiscoveryMetadata } from "./types";

export class MetaService implements PlatformIntegration {
  /**
   * Check if Meta API credentials exist in environment variables.
   */
  isConfigured(): boolean {
    return isMetaConfigured();
  }

  /**
   * Generate Facebook Login URL with HMAC-signed state parameter.
   */
  getConnectUrl(userId: string): string {
    return getMetaAuthUrl(userId);
  }

  /**
   * Perform manual sync for Facebook or Instagram platform.
   */
  async sync(userId: string, platform: string) {
    return syncMetaPlatform(userId, platform);
  }

  /**
   * Orchestrate full Meta callback pipeline:
   *   1. Exchange code -> short-lived user token
   *   2. Exchange short-lived -> 60-day long-lived user token
   *   3. Fetch user profile
   *   4. Discover ALL Facebook Pages & linked Instagram accounts
   *   5. Persist primary connections to DB
   *   6. Return standardized result
   *
   * @param code - Authorization code from query params.
   * @param userId - Verified user ID extracted from signed state.
   */
  async handleCallback(code: string, userId: string): Promise<StandardPlatformConnectionResult> {
    console.log(`[MetaService] Starting callback processing for user ${userId.substring(0, 8)}...`);

    // 1. Short-lived token exchange
    const shortTokenRes = await exchangeCodeForToken(code);

    // 2. Long-lived token exchange (60 days)
    const longTokenRes = await exchangeForLongLivedToken(shortTokenRes.access_token);
    const userAccessToken = longTokenRes.access_token;
    const expiresSec = longTokenRes.expires_in || 60 * 24 * 60 * 60; // 60 days fallback
    const tokenExpiryDate = new Date(Date.now() + expiresSec * 1000).toISOString();

    // 3. User profile metadata
    const userProfile = await fetchUserProfile(userAccessToken);

    // 4. Discover ALL Pages and linked Instagram accounts
    const discoveredAccounts = await fetchAllPages(userAccessToken);

    // Identify primary Facebook Page and primary Instagram Business account
    const primaryPair = discoveredAccounts[0] || null;
    const primaryPage = primaryPair?.page || null;

    // Find first available Instagram account across all discovered pages if primary has none
    const primaryInstagram =
      discoveredAccounts.find((d) => d.instagramAccount !== null)?.instagramAccount || null;

    // Build internal structured discovery payload
    const discoveryData: MetaDiscoveryMetadata = {
      user: userProfile,
      userAccessToken,
      discovered: discoveredAccounts,
      primaryPage,
      primaryInstagram,
      tokenExpiry: tokenExpiryDate,
    };

    // 5. Persist primary connections to database
    await persistMetaConnections(userId, discoveryData);

    // 6. Build standardized connection result object
    const primaryName =
      primaryInstagram?.username
        ? `@${primaryInstagram.username}`
        : primaryPage?.name || userProfile.name || "Meta Connection";

    const primaryId = primaryInstagram?.id || primaryPage?.id || userProfile.id;
    const primaryImage =
      primaryInstagram?.profile_picture_url ||
      primaryPage?.picture?.data?.url ||
      userProfile.picture?.data?.url;

    console.log(`[MetaService] ✅ Callback successful. Primary connected: ${primaryName}`);

    return {
      provider: "meta",
      accountId: primaryId,
      accountName: primaryName,
      profileImage: primaryImage,
      connected: true,
      expiresAt: tokenExpiryDate,
      metadata: discoveryData as unknown as Record<string, unknown>,
    };
  }
}

export const metaService = new MetaService();
