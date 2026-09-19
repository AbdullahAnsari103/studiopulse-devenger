import dotenv from "dotenv";
// Load environment variables before any other imports
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { initializeDatabase, db } from "./db";
import usersRouter from "./routes/users";
import platformsRouter from "./routes/platforms";
import aiRouter from "./routes/ai";
import dashboardRouter from "./routes/dashboard";
import analyticsRouter from "./routes/analytics";
import uploadRouter from "./routes/upload";
import videosRouter from "./routes/videos";
import activityRouter from "./routes/activity";
import calendarRouter from "./routes/calendar";
import autopilotRouter from "./routes/autopilot";
import audienceRouter from "./routes/audience";
import webhooksRouter from "./routes/webhooks";
import editorRouter from "./routes/editor";
import viralClipsRouter from "./routes/viral-clips";
import { runBudgetedAnalyticsPoll } from "./integrations/youtube-ingestion";
import { providerManager } from "./ai/gemini";
import { startAutopilotScheduler } from "./autopilot/scheduler";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// Deployment-ready CORS: support local dev + any deployed origin
const ALLOWED_ORIGINS = [
  "http://localhost:5173", "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin (5173, 5174, 3000, etc.) or production frontend URL
    callback(null, origin || true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/users", usersRouter);
app.use("/api/platforms", platformsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/videos", videosRouter);
app.use("/api/activity", activityRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/autopilot", autopilotRouter);
app.use("/api/audience", audienceRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/editor", editorRouter);
app.use("/api/viral-clips", viralClipsRouter);

// Serve autopilot temp-frames and custom thumbnails as static files
app.use("/api/autopilot/frames", express.static(path.resolve("server/uploads/temp-frames")));
app.use("/api/autopilot/thumbnails", express.static(path.resolve("server/uploads/thumbnails")));
app.use("/api/uploads", express.static(path.resolve("server/uploads")));

// Test Gemini directly on /api/test-gemini
app.get("/api/test-gemini", async (_req, res) => {
  console.log("[Index API] GET /api/test-gemini called");
  try {
    const result = await providerManager.testActiveKey("hello");
    const reqOrigin = _req.headers.origin;
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
    res.status(500).json(providerManager.buildStructuredError(error instanceof Error ? error : new Error(msg)));
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "Studio Pulse API",
    timestamp: new Date().toISOString(),
  });
});

// ─── Budgeted YouTube Analytics Ingestion Poller (every 15 minutes) ───
const FIFTEEN_MINS = 15 * 60 * 1000;

// Start server
async function start() {
  // 1. Bind port immediately so API routes & frontend requests are instantly available
  const server = app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`\n🚀 Studio Pulse API running on http://127.0.0.1:${PORT}`);
    console.log(`   Health:    http://127.0.0.1:${PORT}/api/health`);
    console.log(`   AI Health: http://127.0.0.1:${PORT}/api/ai/health`);
    console.log(`   AI Chat:   http://127.0.0.1:${PORT}/api/ai/chat`);
    console.log(`   Upload:    http://127.0.0.1:${PORT}/api/upload`);
    console.log(`   Webhooks:  http://127.0.0.1:${PORT}/api/webhooks/youtube`);
    console.log(`   Autopilot: http://127.0.0.1:${PORT}/api/autopilot\n`);
  });

  // Increase server timeouts to support long-running video uploads to YouTube
  // Default Node.js HTTP timeout is 120s which kills large file uploads
  server.timeout = 15 * 60 * 1000; // 15 minutes — covers large video uploads
  server.keepAliveTimeout = 65 * 1000; // 65s — slightly above typical LB idle timeout
  server.headersTimeout = 66 * 1000; // Must be > keepAliveTimeout

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ ERROR: Port ${PORT} is already in use by another process.`);
      console.error(`   Please kill the process occupying port ${PORT} and restart server:dev.\n`);
    } else {
      console.error("❌ Server error:", err);
    }
  });

  // 2. Initialize database schema asynchronously with retries
  initializeDatabase().catch((err) => {
    console.warn("⚠️ Database async init warning:", err instanceof Error ? err.message : err);
  });

  // 3. Initialize AI Provider Manager
  providerManager.initialize().catch((err) => {
    console.warn("⚠️ ProviderManager async init warning:", err instanceof Error ? err.message : err);
  });

  // 4. Start Budgeted Analytics Ingestion Poller (every 15 minutes)
  setInterval(runBudgetedAnalyticsPoll, FIFTEEN_MINS);
  console.log("⏰ Budgeted YouTube Analytics & AI Brain poller active (every 15 minutes)");

  // 5. Start Autopilot Queue scheduler
  startAutopilotScheduler();
  console.log("🤖 Autopilot Queue scheduler active (every 5 minutes)");

  // 6. Backfill thumbnail_path for existing queue items (best-effort, one-time migration)
  setTimeout(async () => {
    try {
      const { db: dbClient } = await import("./db");
      const nullItems = await dbClient.execute(`
        SELECT id FROM autopilot_queue WHERE thumbnail_path IS NULL LIMIT 200
      `);
      const framesBase = path.resolve("server/uploads/temp-frames");
      let patched = 0;
      for (const row of nullItems.rows) {
        const itemId = row.id as string;
        const dir = path.join(framesBase, itemId);
        if (!fs.existsSync(dir)) continue;
        // Pick middle frame
        const frames = fs.readdirSync(dir)
          .filter(f => f.endsWith(".jpg"))
          .sort();
        if (frames.length === 0) continue;
        const best = frames[Math.floor(frames.length / 2)];
        const relPath = `${itemId}/${best}`;
        await dbClient.execute({
          sql: "UPDATE autopilot_queue SET thumbnail_path = ? WHERE id = ?",
          args: [relPath, itemId],
        });
        patched++;
      }
      if (patched > 0) console.log(`🖼️  Backfilled thumbnail_path for ${patched} existing queue items`);
    } catch (e) {
      console.warn("⚠️ Thumbnail backfill warning:", e instanceof Error ? e.message : e);
    }
  }, 5000); // run 5s after start
}

// Prevent process crashes from background async errors (e.g. transient network timeouts or OAuth errors)
process.on("unhandledRejection", (reason) => {
  console.warn("⚠️ Unhandled Rejection in background task:", reason instanceof Error ? reason.message : reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err.message);
});

start();

