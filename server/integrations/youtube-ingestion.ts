/**
 * YouTube Ingestion Strategy — The layer that feeds user-brain.ts.
 *
 * Implements a 3-pillar ingestion model to balance real-time freshness and quota efficiency:
 *   1. PUSH NOTIFICATIONS (WebSub/PubSubHubbub) — 0 quota cost, near-real-time new video updates.
 *   2. BUDGETED POLLING — Staggered background polling for slow-moving YouTube Analytics.
 *   3. ON-DEMAND REFRESH — Cooldown-guarded sync triggered when user opens their dashboard.
 */

import { db } from "../db";
import { syncUserBrain } from "../ai/user-brain";
import { syncYouTubeData } from "./youtube/sync";
import { fetchDetailedAnalytics } from "./youtube/detailed-analytics";

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
const TOPIC_URL_BASE = "https://www.youtube.com/xml/feeds/videos.xml?channel_id=";

export async function subscribeToChannelUploads(channelId: string, callbackUrl: string, mode: "subscribe" | "unsubscribe" = "subscribe") {
  const body = new URLSearchParams({
    "hub.callback": callbackUrl,
    "hub.topic": `${TOPIC_URL_BASE}${channelId}`,
    "hub.verify": "async",
    "hub.mode": mode,
    "hub.lease_seconds": String(9 * 24 * 60 * 60), // 9 days (max ~10)
  });

  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`PubSubHubbub subscribe failed for channel ${channelId}: ${res.status}`);
  }

  await db.execute({
    sql: `INSERT INTO youtube_push_subscriptions (channel_id, callback_url, subscribed_at, expires_at)
          VALUES (?, ?, datetime('now'), datetime('now', '+9 days'))
          ON CONFLICT(channel_id) DO UPDATE SET
            subscribed_at = datetime('now'), expires_at = datetime('now', '+9 days')`,
    args: [channelId, callbackUrl],
  });
}

export async function renewExpiringSubscriptions(callbackUrl: string) {
  const rows = await db.execute({
    sql: `SELECT channel_id FROM youtube_push_subscriptions WHERE expires_at < datetime('now', '+1 day')`,
    args: [],
  });
  for (const row of rows.rows) {
    await subscribeToChannelUploads(row.channel_id as string, callbackUrl);
  }
}

export async function handleYouTubePushNotification(method: string, query: Record<string, string>, rawBody: string) {
  if (method === "GET") {
    return { status: 200, body: query["hub.challenge"] || "" };
  }

  if (method === "POST") {
    const videoIdMatch = rawBody.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const channelIdMatch = rawBody.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
    const videoId = videoIdMatch?.[1];
    const channelId = channelIdMatch?.[1];

    if (channelId) {
      const userRes = await db.execute({
        sql: `SELECT user_id FROM youtube_channels WHERE channel_id = ? LIMIT 1`,
        args: [channelId],
      });
      const userId = userRes.rows[0]?.user_id as string | undefined;
      if (userId) {
        void (async () => {
          try {
            await syncYouTubeData(userId);
            await fetchDetailedAnalytics(userId);
            await syncUserBrain(userId);
          } catch (e) {
            console.error("[Ingestion] Resync after WebSub push failed:", e);
          }
        })();
      }
    }

    console.log(`[Ingestion] WebSub Push notification received: video ${videoId} on channel ${channelId}`);
    return { status: 200, body: "ok" };
  }

  return { status: 405, body: "Method Not Allowed" };
}

// ─────────────────────────────────────────────────────────────────────────
// BUDGETED POLLING
// ─────────────────────────────────────────────────────────────────────────

export async function runBudgetedAnalyticsPoll() {
  const staleUsers = await db.execute({
    sql: `SELECT cp.user_id FROM connected_platforms cp
          LEFT JOIN user_brain ub ON ub.user_id = cp.user_id
          WHERE cp.platform = 'youtube' AND cp.is_connected = 1
            AND (ub.updated_at IS NULL OR ub.updated_at < datetime('now', '-15 minutes'))`,
    args: [],
  });

  for (const row of staleUsers.rows) {
    const userId = row.user_id as string;
    void (async () => {
      try {
        await syncYouTubeData(userId);
        await fetchDetailedAnalytics(userId);
        await syncUserBrain(userId);
      } catch (e) {
        console.error(`[Ingestion] Budgeted poll sync failed for user ${userId}:`, e);
      }
    })();
    await new Promise((r) => setTimeout(r, 250)); // spread requests
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ON-DEMAND REFRESH
// ─────────────────────────────────────────────────────────────────────────

const lastOnDemandSync = new Map<string, number>();
const ON_DEMAND_COOLDOWN_MS = 2 * 60_000; // 2 min

export async function requestOnDemandSync(userId: string): Promise<{ synced: boolean }> {
  const last = lastOnDemandSync.get(userId) || 0;
  if (Date.now() - last < ON_DEMAND_COOLDOWN_MS) {
    return { synced: false };
  }
  lastOnDemandSync.set(userId, Date.now());
  await syncYouTubeData(userId);
  await fetchDetailedAnalytics(userId);
  await syncUserBrain(userId);
  return { synced: true };
}
