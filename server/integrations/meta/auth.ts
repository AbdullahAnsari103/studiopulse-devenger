/**
 * Meta OAuth Authentication Module
 *
 * Manages the OAuth 2.0 authorization URL construction (with HMAC signed state)
 * and token exchange logic (short-lived code exchange -> 60-day long-lived token).
 *
 * Uses `metaConfig` for configuration and `metaClient` for requests.
 */

import { metaConfig } from "./config";
import { metaClient } from "./client";
import { createSignedState } from "../../utils/oauth-state";
import type { MetaTokenResponse } from "./types";

/**
 * Returns true if Meta App ID and App Secret are set in environment.
 */
export function isMetaConfigured(): boolean {
  return !!(metaConfig.appId && metaConfig.appSecret);
}

/**
 * Generate the Facebook Login authorization URL for a user.
 * Encodes a tamper-proof signed state containing the user's ID.
 */
export function getMetaAuthUrl(userId: string): string {
  if (!isMetaConfigured()) {
    throw new Error(
      "Meta OAuth credentials not configured. Set META_APP_ID and META_APP_SECRET in environment."
    );
  }

  const signedState = createSignedState(userId, "meta");

  const params = new URLSearchParams({
    client_id: metaConfig.appId,
    redirect_uri: metaConfig.redirectUri,
    state: signedState,
    response_type: "code",
  });

  if (metaConfig.configId) {
    params.set("config_id", metaConfig.configId);
  } else {
    params.set("scope", metaConfig.scopes.join(","));
  }

  const url = `https://www.facebook.com/${metaConfig.apiVersion}/dialog/oauth?${params.toString()}`;
  console.log("[Meta OAuth] Generated auth URL for user:", userId.substring(0, 8));
  return url;
}

/**
 * Exchange authorization code for a short-lived user access token.
 */
export async function exchangeCodeForToken(code: string): Promise<MetaTokenResponse> {
  console.log("[Meta OAuth] Exchanging code for short-lived token...");
  const params: Record<string, string> = {
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    redirect_uri: metaConfig.redirectUri,
    code,
  };

  return metaClient.get<MetaTokenResponse>("/oauth/access_token", undefined, params);
}

/**
 * Exchange a short-lived user access token for a 60-day long-lived user access token.
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaTokenResponse> {
  console.log("[Meta OAuth] Exchanging short-lived token for 60-day long-lived token...");
  const params: Record<string, string> = {
    grant_type: "fb_exchange_token",
    client_id: metaConfig.appId,
    client_secret: metaConfig.appSecret,
    fb_exchange_token: shortLivedToken,
  };

  return metaClient.get<MetaTokenResponse>("/oauth/access_token", undefined, params);
}
