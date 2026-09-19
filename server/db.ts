import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment variables. " +
    "Make sure your .env file exists in the project root."
  );
}

const rawClient = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = {
  ...rawClient,
  async execute(stmt: any) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await rawClient.execute(stmt);
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        if (
          attempt < 3 &&
          (msg.includes("CONNECT_TIMEOUT") ||
           msg.includes("ConnectTimeoutError") ||
           msg.includes("fetch failed") ||
           msg.includes("ETIMEDOUT") ||
           msg.includes("ECONNRESET") ||
           msg.includes("network"))
        ) {
          console.warn(`[Database] Query retry ${attempt}/3 due to network timeout:`, msg);
          await new Promise((r) => setTimeout(r, attempt * 600));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
  async batch(stmts: any[], mode?: any) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await rawClient.batch(stmts, mode);
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        if (
          attempt < 3 &&
          (msg.includes("CONNECT_TIMEOUT") ||
           msg.includes("ConnectTimeoutError") ||
           msg.includes("fetch failed") ||
           msg.includes("ETIMEDOUT") ||
           msg.includes("ECONNRESET") ||
           msg.includes("network"))
        ) {
          console.warn(`[Database] Batch retry ${attempt}/3 due to network timeout:`, msg);
          await new Promise((r) => setTimeout(r, attempt * 600));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
};

/**
 * Initialize database schema.
 * Creates all required tables if they don't exist.
 */
export async function initializeDatabase() {
  let attempts = 0;
  const maxAttempts = 4;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Database] Initializing schema (attempt ${attempts}/${maxAttempts})...`);
      
      // Execute schema creation
      await runSchemaQueries();

      console.log("✅ Database initialized — all tables ready");
      return;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Database] ⚠ DB initialization attempt ${attempts} failed: ${msg.substring(0, 100)}`);
      if (attempts >= maxAttempts) {
        console.error("❌ Database initialization exhausted all retries. Continuing in degraded mode.");
        return;
      }
      // Wait before retrying (1s, 2s, 3s...)
      await new Promise((res) => setTimeout(res, attempts * 1500));
    }
  }
}

async function runSchemaQueries() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clerk_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      image_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS connected_platforms (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_id TEXT,
      account_name TEXT,
      account_email TEXT,
      profile_image TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TEXT,
      connected_at TEXT DEFAULT (datetime('now')),
      last_sync TEXT,
      is_connected INTEGER DEFAULT 1,
      UNIQUE(user_id, platform)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      subscribers INTEGER DEFAULT 0,
      engagement REAL DEFAULT 0,
      date TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT,
      thumbnail TEXT,
      views INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      uploaded_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_channels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      thumbnail TEXT,
      subscriber_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      watch_time_minutes REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, channel_id)
    )
  `);

  try {
    await db.execute(`ALTER TABLE youtube_channels ADD COLUMN watch_time_minutes REAL DEFAULT 0`);
  } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_videos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      thumbnail TEXT,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      dislikes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      watch_time_minutes REAL DEFAULT 0,
      average_view_duration REAL DEFAULT 0,
      average_view_percentage REAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      revenue REAL DEFAULT 0,
      published_at TEXT,
      duration TEXT,
      is_short INTEGER DEFAULT 0,
      is_live INTEGER DEFAULT 0,
      subscribers_gained INTEGER DEFAULT 0,
      category TEXT DEFAULT 'Education',
      visibility TEXT DEFAULT 'public',
      status TEXT DEFAULT 'published',
      privacy_status TEXT DEFAULT 'public',
      tags TEXT,
      language TEXT DEFAULT 'en',
      playlist_id TEXT,
      scheduled_at TEXT,
      monetization_status TEXT DEFAULT 'Monetized',
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, video_id)
    )
  `);

  // Migration logic for existing SQLite tables (adds missing columns safely)
  const columnsToAdd = [
    { name: "category", type: "TEXT DEFAULT 'Education'" },
    { name: "visibility", type: "TEXT DEFAULT 'public'" },
    { name: "status", type: "TEXT DEFAULT 'published'" },
    { name: "privacy_status", type: "TEXT DEFAULT 'public'" },
    { name: "tags", type: "TEXT" },
    { name: "language", type: "TEXT DEFAULT 'en'" },
    { name: "playlist_id", type: "TEXT" },
    { name: "scheduled_at", type: "TEXT" },
    { name: "monetization_status", type: "TEXT DEFAULT 'Monetized'" },
    { name: "is_live", type: "INTEGER DEFAULT 0" },
  ];

  for (const col of columnsToAdd) {
    try {
      await db.execute(`ALTER TABLE youtube_videos ADD COLUMN ${col.name} ${col.type}`);
    } catch {
      // Column already exists
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_analytics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      views INTEGER,
      estimated_minutes_watched REAL,
      average_view_duration REAL,
      subscribers_gained INTEGER,
      subscribers_lost INTEGER,
      likes INTEGER,
      dislikes INTEGER,
      shares INTEGER,
      comments INTEGER,
      impressions INTEGER,
      ctr REAL,
      estimated_revenue REAL,
      status TEXT DEFAULT 'FINAL',
      source TEXT DEFAULT 'youtube_analytics',
      last_synced_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    )
  `);

  const analyticsCols = [
    { name: "status", type: "TEXT DEFAULT 'FINAL'" },
    { name: "source", type: "TEXT DEFAULT 'youtube_analytics'" },
    { name: "last_synced_at", type: "TEXT" },
  ];

  for (const col of analyticsCols) {
    try {
      await db.execute(`ALTER TABLE youtube_analytics ADD COLUMN ${col.name} ${col.type}`);
    } catch (err: any) {
      // Column already exists or handled
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_daily_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      date TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      watch_time_minutes REAL DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      average_view_duration REAL DEFAULT 0,
      estimated_revenue REAL DEFAULT 0,
      subscribers_gained INTEGER DEFAULT 0,
      UNIQUE(user_id, video_id, date)
    )
  `);

  // ─── AI Chat Tables ───

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Conversation',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      is_archived INTEGER DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
    )
  `);

  // ─── Personalized User AI Brain Table ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_brain (
      user_id TEXT PRIMARY KEY,
      channel_title TEXT,
      subscribers INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      avg_ctr REAL DEFAULT 0,
      avg_retention REAL DEFAULT 0,
      watch_time_30d REAL DEFAULT 0,
      revenue_30d REAL DEFAULT 0,
      top_video_titles TEXT,
      recent_upload_titles TEXT,
      content_insights TEXT,
      custom_memories TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Machine-Learning Knowledge Expansion Tables ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_learning_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      epoch_timestamp TEXT DEFAULT (datetime('now')),
      insight_type TEXT NOT NULL,
      insight_summary TEXT NOT NULL,
      confidence_score REAL DEFAULT 0.95,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ai_brain_evolution (
      user_id TEXT PRIMARY KEY,
      cumulative_knowledge TEXT NOT NULL,
      total_learning_epochs INTEGER DEFAULT 0,
      last_learned_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_push_subscriptions (
      channel_id TEXT PRIMARY KEY,
      callback_url TEXT NOT NULL,
      subscribed_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Upload Center Tables ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT,
      file_path TEXT,
      file_size INTEGER,
      mime_type TEXT,
      thumbnail_path TEXT,
      title TEXT,
      description TEXT,
      tags TEXT,
      category TEXT,
      visibility TEXT DEFAULT 'private',
      scheduled_at TEXT,
      status TEXT DEFAULT 'draft',
      platforms TEXT,
      youtube_playlist_id TEXT,
      youtube_category_id TEXT DEFAULT '22',
      license TEXT DEFAULT 'youtube',
      notify_subscribers INTEGER DEFAULT 1,
      made_for_kids INTEGER DEFAULT 0,
      allow_comments INTEGER DEFAULT 1,
      show_stats INTEGER DEFAULT 1,
      language TEXT DEFAULT 'en',
      recording_date TEXT,
      age_restricted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS published_posts (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      platform_video_id TEXT,
      platform_url TEXT,
      status TEXT DEFAULT 'processing',
      published_at TEXT,
      metadata TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (upload_id) REFERENCES uploads(id)
    )
  `);

  // ─── User Activity Log (AI Brain Feed) ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      page TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Calendar System Tables ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'upload',
      platform TEXT DEFAULT 'youtube',
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT DEFAULT 'scheduled',
      priority TEXT DEFAULT 'medium',
      color TEXT,
      reminder_minutes INTEGER DEFAULT 30,
      repeat_rule TEXT DEFAULT 'none',
      video_id TEXT,
      campaign_id TEXT,
      tags TEXT,
      notes TEXT,
      is_milestone INTEGER DEFAULT 0,
      milestone_badge TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS calendar_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      platform TEXT DEFAULT 'youtube',
      trigger_at TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      type TEXT DEFAULT 'reminder',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS calendar_campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      platforms TEXT,
      status TEXT DEFAULT 'active',
      progress INTEGER DEFAULT 0,
      budget REAL DEFAULT 0,
      goal TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS calendar_milestones (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      metric_type TEXT,
      target_value REAL NOT NULL,
      current_value REAL DEFAULT 0,
      achieved_at TEXT,
      icon TEXT,
      status TEXT DEFAULT 'in_progress',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Autopilot Queue Tables ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS autopilot_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      thumbnail_path TEXT,
      custom_thumbnail_path TEXT,
      title TEXT,
      description TEXT,
      tags TEXT,
      category_id TEXT DEFAULT '22',
      platform TEXT DEFAULT 'youtube',
      platforms TEXT,
      scheduled_at TEXT,
      schedule_mode TEXT DEFAULT 'ai',
      visibility TEXT DEFAULT 'public',
      playlist_id TEXT,
      license TEXT DEFAULT 'youtube',
      notify_subscribers INTEGER DEFAULT 1,
      made_for_kids INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      queue_order INTEGER DEFAULT 0,
      batch_id TEXT,
      status TEXT DEFAULT 'pending',
      platform_video_id TEXT,
      platform_url TEXT,
      publish_error TEXT,
      ai_metadata TEXT,
      ai_content_summary TEXT,
      user_context TEXT,
      video_duration_seconds INTEGER DEFAULT 0,
      aspect_ratio TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      published_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS autopilot_settings (
      user_id TEXT PRIMARY KEY,
      default_platform TEXT DEFAULT 'youtube',
      default_visibility TEXT DEFAULT 'public',
      max_per_day INTEGER DEFAULT 1,
      preferred_time TEXT DEFAULT '16:00',
      timezone TEXT DEFAULT 'UTC',
      auto_classify INTEGER DEFAULT 1,
      auto_metadata INTEGER DEFAULT 1,
      notify_on_publish INTEGER DEFAULT 1,
      pause_queue INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Autopilot Notifications Table ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS autopilot_notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      queue_item_id TEXT,
      type TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── User Behavior Profile (Behavioral Engine) ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_behavior_profile (
      user_id TEXT PRIMARY KEY,
      video_type_history TEXT DEFAULT '{}',
      platform_preferences TEXT DEFAULT '{}',
      avg_upload_hour INTEGER DEFAULT 12,
      preferred_visibility TEXT DEFAULT 'public',
      total_uploads INTEGER DEFAULT 0,
      total_publishes INTEGER DEFAULT 0,
      last_upload_at TEXT,
      last_publish_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── YouTube Comments Table ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS youtube_comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      comment_id TEXT NOT NULL UNIQUE,
      author_name TEXT,
      author_profile_image TEXT,
      text_original TEXT,
      text_display TEXT,
      like_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      published_at TEXT,
      is_reply INTEGER DEFAULT 0,
      parent_id TEXT,
      sentiment TEXT DEFAULT 'neutral',
      fetched_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Comment Analysis Cache ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comment_analysis (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT,
      analysis_type TEXT NOT NULL,
      result TEXT NOT NULL,
      comment_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, video_id, analysis_type)
    )
  `);

  // ─── Auto Reply Settings ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS auto_reply_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      creator_context TEXT DEFAULT '',
      auto_reply_enabled INTEGER DEFAULT 0,
      reply_to_positive INTEGER DEFAULT 1,
      reply_to_negative INTEGER DEFAULT 1,
      reply_to_questions INTEGER DEFAULT 1,
      reply_to_neutral INTEGER DEFAULT 0,
      max_replies_per_run INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    )
  `);

  // ─── Add owner_replied columns to youtube_comments (best-effort migration) ───
  for (const col of [
    "owner_replied INTEGER DEFAULT 0",
    "owner_reply_text TEXT",
    "owner_reply_at TEXT",
    "owner_reply_youtube_id TEXT",
  ]) {
    try {
      await db.execute(`ALTER TABLE youtube_comments ADD COLUMN ${col}`);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // ─── Add custom_thumbnail_path to autopilot_queue (best-effort migration) ───
  try {
    await db.execute(`ALTER TABLE autopilot_queue ADD COLUMN custom_thumbnail_path TEXT`);
  } catch {
    // Column already exists — safe to ignore
  }

  // ─── Fix thumbnail URLs — use mqdefault which exists reliably for all videos & shorts ───
  try {
    await db.execute(`UPDATE youtube_videos SET thumbnail = REPLACE(thumbnail, 'hqdefault', 'mqdefault') WHERE thumbnail LIKE '%hqdefault%'`);
    await db.execute(`UPDATE youtube_channels SET thumbnail = REPLACE(thumbnail, 'hqdefault', 'mqdefault') WHERE thumbnail LIKE '%hqdefault%'`);
  } catch {
    // Best-effort — tables may not exist yet
  }

  // ─── Creator Tone Profile Cache ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tone_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tone_summary TEXT NOT NULL,
      formality TEXT DEFAULT 'casual',
      emoji_usage TEXT DEFAULT 'moderate',
      avg_reply_length TEXT DEFAULT 'short',
      asks_followups INTEGER DEFAULT 0,
      uses_humor INTEGER DEFAULT 0,
      language_style TEXT DEFAULT 'english',
      sample_replies TEXT,
      analyzed_reply_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    )
  `);

  console.log("✅ Database initialized — all tables ready");
}
