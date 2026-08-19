/**
 * AI Orchestrator — The brain of Studio AI.
 * 
 * Flow:
 * 1. Detect user intent
 * 2. Fetch required platform data from DB
 * 3. Build analytics context
 * 4. Stream Gemini response with context
 */

import type { Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { detectIntent, requiresYouTubeData, requiresPlatformData } from "./intent-detector";
import { buildAnalyticsContext } from "./context-builder";
import { streamGeminiResponse, callGemini, AllKeysExhaustedError, type GeminiMessage } from "./gemini";
import { getSystemPrompt, TITLE_GENERATION_PROMPT } from "./system-prompt";
import { fetchDetailedAnalytics } from "../integrations/youtube/detailed-analytics";
import { getUserBrainContext, syncUserBrain } from "./user-brain";

export interface ChatRequest {
  userId: string;
  conversationId: string | null;
  message: string;
  userName: string;
}

/**
 * Process a chat message: detect intent, build user brain context, stream Gemini response.
 * Writes SSE events to the Express response.
 */
export async function processChat(req: ChatRequest, res: Response): Promise<void> {
  const { userId, message, userName } = req;
  let { conversationId } = req;

  try {
    // 1. Create or get conversation
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      await db.execute({
        sql: "INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, 'New Conversation', datetime('now'), datetime('now'))",
        args: [conversationId, userId],
      });

      // Send conversation ID to client
      sendSSE(res, "conversation_id", { conversationId });

      // Generate title in background (don't await)
      generateTitle(conversationId, message).catch(() => {});
    }

    // 2. Save user message
    const userMsgId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO ai_messages (id, conversation_id, user_id, role, content, created_at) VALUES (?, ?, ?, 'user', ?, datetime('now'))",
      args: [userMsgId, conversationId, userId, message],
    });

    // 3. Detect intent
    const intent = detectIntent(message);
    console.log(`[Orchestrator] Intent: ${intent} for message: "${message.substring(0, 80)}..."`);

    // 4. Always Load User AI Personal Brain
    const userBrain = await getUserBrainContext(userId);
    let hasYouTube = userBrain.hasYouTube;
    let hasYouTubeData = userBrain.hasYouTube;
    let contextBlock = "";

    // 5. Detect whether the question requires deep live platform analytics
    const platformSpecific = requiresPlatformData(message, intent);
    console.log(`[Orchestrator] requiresPlatformData: ${platformSpecific} | intent: ${intent}`);

    if (platformSpecific && hasYouTube) {
      console.log(`[StudioAI] Analytics Intent Detected — Fetching fresh YouTube Analytics for userId=${userId}`);
      try {
        await fetchDetailedAnalytics(userId);
        // Refresh brain after live fetch
        await syncUserBrain(userId);
      } catch (error) {
        console.warn("[StudioAI] Live Analytics fetch optional sync failed, using brain database data:", error);
      }

      // Build granular context from DB
      const analyticsContext = await buildAnalyticsContext(userId, intent);
      if (analyticsContext.summary) {
        contextBlock = `\n\n--- GRANULAR ANALYTICS DATA FOR THIS QUESTION ---\n${analyticsContext.summary}\n--- END GRANULAR DATA ---\n`;
      }
    }

    // 6. Build conversation history for Gemini
    const historyResult = await db.execute({
      sql: "SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });

    const history: GeminiMessage[] = [];
    for (const row of historyResult.rows) {
      if (row.role === "user") {
        history.push({ role: "user", parts: [{ text: row.content as string }] });
      } else if (row.role === "assistant") {
        history.push({ role: "model", parts: [{ text: row.content as string }] });
      }
    }

    if (history.length > 0 && history[history.length - 1].role === "user") {
      history.pop();
    }

    // 7. Get system prompt WITH User's Personal AI Brain context
    const systemPrompt = getSystemPrompt(userName, hasYouTube, hasYouTubeData, userBrain.summary);

    // 8. Construct the user message with analytics context
    const enrichedMessage = contextBlock
      ? `${message}\n${contextBlock}`
      : message;

    // 9. Stream response
    sendSSE(res, "start", { intent });

    const streamResult = await streamGeminiResponse(systemPrompt, history, enrichedMessage);

    let fullResponse = "";
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        sendSSE(res, "chunk", { text });
      }
    }

    // 10. Save assistant response
    const assistantMsgId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO ai_messages (id, conversation_id, user_id, role, content, metadata, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, datetime('now'))",
      args: [
        assistantMsgId,
        conversationId,
        userId,
        fullResponse,
        JSON.stringify({ intent, hasYouTubeData }),
      ],
    });

    // Update conversation timestamp
    await db.execute({
      sql: "UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?",
      args: [conversationId],
    });

    sendSSE(res, "done", { messageId: assistantMsgId });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Orchestrator] Error:", errMsg);

    // Graceful fallback for quota exhaustion
    if (error instanceof AllKeysExhaustedError) {
      const fallbackMessage = "Studio AI is temporarily unavailable because all AI providers have exhausted their available quota. Please try again in a few minutes. Your message has been saved and will be here when you return. 🙏";

      sendSSE(res, "start", { intent: "error" });
      sendSSE(res, "chunk", { text: fallbackMessage });

      // Save fallback as assistant message so it appears in history
      if (conversationId) {
        const fallbackMsgId = crypto.randomUUID();
        await db.execute({
          sql: "INSERT INTO ai_messages (id, conversation_id, user_id, role, content, metadata, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, datetime('now'))",
          args: [fallbackMsgId, conversationId, userId, fallbackMessage, JSON.stringify({ intent: "quota_exhausted", error: true })],
        }).catch(() => {});

        sendSSE(res, "done", { messageId: fallbackMsgId });
      } else {
        sendSSE(res, "done", { messageId: "fallback" });
      }
    } else {
      sendSSE(res, "error", { error: errMsg });
    }
  }
}

/**
 * Send a Server-Sent Event to the response.
 */
function sendSSE(res: Response, event: string, data: Record<string, unknown>) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Generate a conversation title from the first message using Gemini.
 */
async function generateTitle(conversationId: string, firstMessage: string): Promise<void> {
  try {
    const title = await callGemini(TITLE_GENERATION_PROMPT, firstMessage);
    const cleanTitle = title.trim().replace(/^["']|["']$/g, "").substring(0, 100);
    await db.execute({
      sql: "UPDATE ai_conversations SET title = ? WHERE id = ?",
      args: [cleanTitle, conversationId],
    });
  } catch (error) {
    console.error("[Orchestrator] Title generation failed:", error);
  }
}
