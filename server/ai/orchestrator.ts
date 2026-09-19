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
import { getUserBehaviorProfile } from "../autopilot/behavior-engine";
import { extractUrls, decideWebSearchNeed, type WebSource } from "./web-agent";
import { executeResearchAgent } from "./research/research-agent";
import { sanitizeAnswerWithDossier } from "./research/answer-sanitizer";
import type { EvidenceDossier } from "./research/types";

export interface ChatRequest {
  userId: string;
  conversationId: string | null;
  message: string;
  userName: string;
  aiMode?: "normal" | "web";
}

/**
 * Process a chat message: detect intent, build user brain context, stream Gemini response.
 * Writes SSE events to the Express response.
 */
export async function processChat(req: ChatRequest, res: Response): Promise<void> {
  const { userId, message, userName, aiMode } = req;
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
    console.log(`[Orchestrator] Intent: ${intent} | Mode: ${aiMode || 'normal'} for message: "${message.substring(0, 80)}..."`);

    // 4. Always Load User AI Personal Brain & Behavior Profile
    let behaviorProfile: any = null;
    let userBrain: any;
    try {
      [userBrain, behaviorProfile] = await Promise.all([
        getUserBrainContext(userId),
        getUserBehaviorProfile(userId).catch(() => null),
      ]);
    } catch {
      userBrain = await getUserBrainContext(userId).catch(() => ({ hasYouTube: false, summary: "" }));
    }

    let hasYouTube = userBrain.hasYouTube;
    let hasYouTubeData = userBrain.hasYouTube;
    let contextBlock = "";
    let webSources: WebSource[] = [];

    let behaviorSummary = "";
    if (behaviorProfile && behaviorProfile.totalUploads > 0) {
      behaviorSummary = `Creator Habits: Typically publishes around ${behaviorProfile.avgUploadHour}:00 UTC. Total uploads: ${behaviorProfile.totalUploads}. Preferred format: ${behaviorProfile.suggestedVideoType}. Primary platform: ${behaviorProfile.suggestedPlatforms?.[0] || "YouTube"}.`;
    }

    // 5. Intelligent Web Search Execution
    const hasUrls = extractUrls(message).length > 0;
    const searchDecision = await decideWebSearchNeed(message, aiMode);
    const shouldSearchWeb = hasUrls || searchDecision.needsWebSearch || intent === "web_search";

    let activeDossier: EvidenceDossier | null = null;

    if (shouldSearchWeb) {
      const activeQuery = searchDecision.searchQuery || message.slice(0, 80);
      console.log(`[Orchestrator] 🔬 Smart Research Agent Activated for: "${activeQuery}"`);
      sendSSE(res, "web_search", { stage: "searching_web", status: "searching", query: activeQuery, message: "Searching the web…" });

      try {
        const researchResult = await executeResearchAgent(
          message,
          (progress) => {
            sendSSE(res, "web_search", {
              stage: progress.stage,
              status: progress.stage,
              message: progress.message,
              detail: progress.detail,
              query: activeQuery,
              sourcesCount: progress.sourcesCount,
            });
          },
          aiMode
        );

        if (researchResult.sources.length > 0) {
          activeDossier = researchResult.dossier;
          webSources = researchResult.sources;
          sendSSE(res, "web_sources", { sources: webSources });
          contextBlock += researchResult.contextText;
        }
      } catch (webErr) {
        console.warn("[Orchestrator] Research agent execution failed gracefully:", webErr);
      }
    }

    // 6. Detect whether the question requires deep live platform analytics
    const platformSpecific = requiresPlatformData(message, intent);
    console.log(`[Orchestrator] requiresPlatformData: ${platformSpecific} | intent: ${intent}`);

    if (platformSpecific && hasYouTube) {
      console.log(`[StudioAI] Analytics Intent Detected — Fetching fresh YouTube Analytics for userId=${userId}`);
      try {
        await fetchDetailedAnalytics(userId);
        await syncUserBrain(userId);
      } catch (error) {
        console.warn("[StudioAI] Live Analytics fetch optional sync failed, using brain database data:", error);
      }

      // Build granular context from DB
      const analyticsContext = await buildAnalyticsContext(userId, intent);
      if (analyticsContext.summary) {
        contextBlock += `\n\n--- GRANULAR ANALYTICS DATA FOR THIS QUESTION ---\n${analyticsContext.summary}\n--- END GRANULAR DATA ---\n`;
      }
    }

    // 7. Build conversation history for Gemini
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

    // 8. Get system prompt WITH User's Personal AI Brain + Behavior context
    const systemPrompt = getSystemPrompt(
      userName,
      hasYouTube,
      hasYouTubeData,
      userBrain.summary,
      behaviorSummary
    );

    // 9. Construct the user message with analytics/web context
    // Truncate context to prevent 413 "Request Entity Too Large" errors.
    // Most Groq models have ~32K token limits (~120K chars). Keep context under 6K chars.
    const MAX_CONTEXT_CHARS = 6000;
    let safeContext = contextBlock;
    if (safeContext.length > MAX_CONTEXT_CHARS) {
      console.warn(`[Orchestrator] ⚠️ Context too large (${safeContext.length} chars), truncating to ${MAX_CONTEXT_CHARS}`);
      safeContext = safeContext.substring(0, MAX_CONTEXT_CHARS) + "\n\n[Context truncated for brevity — key sources included above]";
    }

    const enrichedMessage = safeContext
      ? `${message}\n${safeContext}`
      : message;

    // Limit conversation history to last 10 messages to prevent oversized payloads
    const MAX_HISTORY_MESSAGES = 10;
    const trimmedHistory = history.length > MAX_HISTORY_MESSAGES
      ? history.slice(-MAX_HISTORY_MESSAGES)
      : history;

    // 10. Stream response
    sendSSE(res, "start", { intent, isWebSearch: webSources.length > 0, sources: webSources });

    const streamResult = await streamGeminiResponse(systemPrompt, trimmedHistory, enrichedMessage);
    console.log(`[Orchestrator] ✅ Stream obtained, consuming chunks...`);

    let fullResponse = "";
    let chunksSent = 0;
    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        chunksSent++;
        sendSSE(res, "chunk", { text });
      }
    }
    console.log(`[Orchestrator] 📝 Stream complete: ${chunksSent} chunks, ${fullResponse.length} chars total`);

    // 10b. Mandatory Fact-Gating & Grounding Pass
    if (activeDossier && activeDossier.inspectedSources.length > 0 && fullResponse.length > 30) {
      try {
        const audit = await sanitizeAnswerWithDossier(fullResponse, activeDossier);
        if (audit.hadHallucinations && audit.sanitizedAnswer && audit.sanitizedAnswer !== fullResponse) {
          fullResponse = audit.sanitizedAnswer;
          sendSSE(res, "replace", { text: fullResponse });
        }
      } catch (gateErr) {
        console.warn("[Orchestrator] Fact gate pass completed with draft:", gateErr);
      }
    }

    // 11. Save assistant response
    const assistantMsgId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO ai_messages (id, conversation_id, user_id, role, content, metadata, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, datetime('now'))",
      args: [
        assistantMsgId,
        conversationId,
        userId,
        fullResponse,
        JSON.stringify({ intent, hasYouTubeData, sources: webSources }),
      ],
    });

    // Update conversation timestamp
    await db.execute({
      sql: "UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?",
      args: [conversationId],
    });

    sendSSE(res, "done", { messageId: assistantMsgId, sources: webSources });
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
      // Never leak internal error details to the client
      sendSSE(res, "error", {
        error: "Something went wrong processing your request. Please try again.",
        reason: "unknown"
      });
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
