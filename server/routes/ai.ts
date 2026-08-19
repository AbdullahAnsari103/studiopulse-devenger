/**
 * AI API Routes — Chat, conversations, health check, test, and streaming.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import { processChat } from "../ai/orchestrator";
import { providerManager } from "../ai/gemini";

const router = Router();

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────

/**
 * GET /api/ai/health
 * Returns the health status of all Gemini API keys.
 */
router.get("/health", (_req: Request, res: Response) => {
  try {
    const report = providerManager.getHealthReport();
    res.json(report);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Health check failed";
    res.status(500).json({ success: false, provider: "gemini", reason: "unknown", message: msg });
  }
});

/**
 * POST /api/ai/health/reverify
 * Force re-verify all keys with real Gemini API calls.
 */
router.post("/health/reverify", async (_req: Request, res: Response) => {
  try {
    const report = await providerManager.reverifyAllKeys();
    res.json(report);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Re-verification failed";
    res.status(500).json({ success: false, provider: "gemini", reason: "unknown", message: msg });
  }
});

/**
 * GET /api/ai/health/logs
 * Returns recent request logs for diagnostics.
 */
router.get("/health/logs", (_req: Request, res: Response) => {
  try {
    const logs = providerManager.getRequestLogs();
    res.json({ logs, total: logs.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch logs";
    res.status(500).json({ error: msg });
  }
});

// ─── TEST ENDPOINT ──────────────────────────────────────────────────────────

/**
 * GET /api/ai/test-gemini
 * Send "hello" to Gemini using the active key and return the raw response.
 * Uses real API calls — no mock data.
 */
router.get("/test-gemini", async (_req: Request, res: Response) => {
  console.log("[Test Gemini] 🧪 Test endpoint called");
  try {
    const result = await providerManager.testActiveKey("hello");
    console.log(`[Test Gemini] Result: ${result.success ? "✅" : "❌"} | Model: ${result.model} | Key: ${result.keyIndex} | ${result.durationMs}ms`);
    
    // Explicit CORS headers
    const reqOrigin = req.headers.origin;
    if (reqOrigin) res.setHeader("Access-Control-Allow-Origin", reqOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (!result.success) {
      const err = new Error(result.error || "Unknown test error");
      res.status(500).json(providerManager.buildStructuredError(err));
    } else {
      res.json(result);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Test failed";
    console.error("[Test Gemini] Error:", msg);
    res.status(500).json(providerManager.buildStructuredError(error instanceof Error ? error : new Error(msg)));
  }
});

// ─── CHAT ───────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Send a message and receive a streamed response via SSE.
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { userId, conversationId, message, userName } = req.body;

    if (!userId || !message) {
      res.status(400).json({ error: "userId and message are required" });
      return;
    }

    // Set up SSE headers with dynamic CORS configuration
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    const reqOrigin = req.headers.origin;
    if (reqOrigin) res.setHeader("Access-Control-Allow-Origin", reqOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.flushHeaders();

    // Process the chat through the orchestrator
    await processChat(
      {
        userId,
        conversationId: conversationId || null,
        message,
        userName: userName || "Creator",
      },
      res
    );

    res.end();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Chat failed";
    console.error("[AI Chat] Error:", msg);
    const structuredErr = providerManager.buildStructuredError(error instanceof Error ? error : new Error(msg));

    if (!res.headersSent) {
      res.status(structuredErr.reason === "quota_exceeded" || structuredErr.reason === "all_keys_exhausted" ? 429 : 500)
         .json(structuredErr);
    } else {
      res.write(`event: error\ndata: ${JSON.stringify(structuredErr)}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/ai/conversations
 * List all conversations for a user, sorted by most recent.
 */
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const result = await db.execute(
      `SELECT id, title, created_at, updated_at, is_archived
            FROM ai_conversations
            WHERE user_id = ? AND is_archived = 0
            ORDER BY updated_at DESC
            LIMIT 50`,
      [userId]
    );

    res.json({ conversations: result.rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch conversations";
    console.error("[AI Conversations] Error:", msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/ai/conversations/:id
 * Get a conversation with all its messages.
 */
router.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const convResult = await db.execute(
      "SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (convResult.rows.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messagesResult = await db.execute(
      "SELECT id, role, content, metadata, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC",
      [id]
    );

    res.json({
      conversation: convResult.rows[0],
      messages: messagesResult.rows,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch conversation";
    console.error("[AI Conversation] Error:", msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/ai/conversations
 * Create a new empty conversation.
 */
router.post("/conversations", async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const id = crypto.randomUUID();
    await db.execute(
      "INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, 'New Conversation', datetime('now'), datetime('now'))",
      [id, userId]
    );

    res.json({ id, title: "New Conversation" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create conversation";
    console.error("[AI Create Conv] Error:", msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * DELETE /api/ai/conversations/:id
 * Delete a conversation and all its messages.
 */
router.delete("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    // Delete messages first (foreign key)
    await db.execute(
      "DELETE FROM ai_messages WHERE conversation_id = ? AND user_id = ?",
      [id, userId]
    );

    await db.execute(
      "DELETE FROM ai_conversations WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to delete conversation";
    console.error("[AI Delete Conv] Error:", msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * PATCH /api/ai/conversations/:id
 * Update conversation title or archive status.
 */
router.patch("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, title, isArchived } = req.body;

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      args.push(title);
    }
    if (isArchived !== undefined) {
      updates.push("is_archived = ?");
      args.push(isArchived ? 1 : 0);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    updates.push("updated_at = datetime('now')");
    args.push(id);
    args.push(userId);

    await db.execute(
      `UPDATE ai_conversations SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args
    );

    res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update conversation";
    console.error("[AI Update Conv] Error:", msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
