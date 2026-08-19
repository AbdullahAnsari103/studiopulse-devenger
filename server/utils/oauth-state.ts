/**
 * OAuth State Signing Utility
 *
 * Creates and verifies HMAC-signed OAuth state parameters to prevent
 * CSRF and tampering attacks. Uses the existing ENCRYPTION_SECRET
 * from the project's environment variables.
 *
 * The signed state format: base64url(payload).hmac_signature
 * Payload contains: { userId, provider, ts (timestamp) }
 * State expires after 10 minutes.
 */

import CryptoJS from "crypto-js";

const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET || "studio-pulse-default-encryption-key-change-me";

/** Maximum age of a valid state parameter (10 minutes). */
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

interface StatePayload {
  userId: string;
  provider: string;
  ts: number;
}

/**
 * Create an HMAC-signed OAuth state string.
 * @param userId  - The Clerk user ID initiating the OAuth flow.
 * @param provider - The provider name (e.g., "meta", "youtube").
 * @returns A tamper-proof state string: base64(payload).hmac
 */
export function createSignedState(userId: string, provider: string): string {
  const payload: StatePayload = {
    userId,
    provider,
    ts: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = CryptoJS.HmacSHA256(payloadStr, ENCRYPTION_SECRET).toString();

  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an HMAC-signed OAuth state string.
 * Returns the decoded payload if valid, or null if tampered/expired.
 *
 * @param state - The state string from the OAuth callback query parameter.
 * @returns The decoded payload or null.
 */
export function verifySignedState(state: string): { userId: string; provider: string } | null {
  const dotIndex = state.indexOf(".");
  if (dotIndex === -1) {
    console.warn("[OAuth State] Invalid state format — no signature separator found.");
    return null;
  }

  const payloadStr = state.substring(0, dotIndex);
  const receivedSignature = state.substring(dotIndex + 1);

  // Recompute HMAC
  const expectedSignature = CryptoJS.HmacSHA256(payloadStr, ENCRYPTION_SECRET).toString();
  if (receivedSignature !== expectedSignature) {
    console.warn("[OAuth State] Signature mismatch — state may have been tampered.");
    return null;
  }

  // Decode payload
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString("utf-8"));
  } catch {
    console.warn("[OAuth State] Failed to decode payload.");
    return null;
  }

  // Check expiration
  if (Date.now() - payload.ts > STATE_MAX_AGE_MS) {
    console.warn("[OAuth State] State expired (older than 10 minutes).");
    return null;
  }

  return {
    userId: payload.userId,
    provider: payload.provider,
  };
}
