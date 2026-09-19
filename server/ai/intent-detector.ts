/**
 * Lightweight intent classifier for Studio AI.
 * Determines what data the orchestrator needs to fetch before calling Gemini.
 */

export type AIIntent =
  | "general"                // General conversation, no platform data needed
  | "web_search"              // Web search or URL scraping
  | "youtube_channel"        // Channel-level questions (subscribers, growth, overview)
  | "youtube_videos"         // Video-specific questions (top videos, worst videos, specific video)
  | "youtube_revenue"        // Revenue / monetization questions
  | "youtube_analytics"      // Analytics deep dive (CTR, retention, impressions)
  | "youtube_trends"         // Trend analysis (growth/decline, comparisons over time)
  | "content_strategy"       // Content strategy (may benefit from data if available)
  | "youtube_shorts"         // Shorts-specific questions
  | "youtube_audience";      // Audience-related (geography, demographics, traffic sources)

interface IntentPattern {
  intent: AIIntent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "web_search",
    patterns: [
      /https?:\/\//i,
      /search (the )?web/i,
      /look ?up/i,
      /browse (the )?web/i,
      /find (online|info on|articles? about)/i,
      /compare .* (202[4-9]|today|latest|current)/i,
      /what (is|are) (trending|the latest)/i,
      /recent news/i,
    ],
    keywords: ["search", "web", "lookup", "browse", "compare", "trending", "news", "online", "latest", "specs", "price", "reviews"],
  },
  {
    intent: "youtube_revenue",
    patterns: [
      /revenue/i, /earn(ing|ed|s)?/i, /monetiz/i, /income/i, /money/i,
      /\$\d/i, /how much (did|do|have|am)/i, /rpm/i, /cpm/i, /adsense/i,
    ],
    keywords: ["revenue", "earning", "earnings", "money", "income", "monetize", "monetization", "rpm", "cpm", "adsense", "paid"],
  },
  {
    intent: "youtube_analytics",
    patterns: [
      /ctr/i, /click.?through/i, /retention/i, /impression/i, /watch\s*time/i,
      /average view/i, /audience retention/i, /analytics/i, /metric/i,
      /perform(ance|ing)/i, /underperform/i, /overperform/i,
    ],
    keywords: ["ctr", "click-through", "retention", "impressions", "watch time", "analytics", "metrics", "performance", "underperforming", "performing"],
  },
  {
    intent: "youtube_videos",
    patterns: [
      /top video/i, /best video/i, /worst video/i, /which video/i, /my video/i,
      /latest (video|upload)/i, /recent (video|upload)/i, /most view/i,
      /least view/i, /hurting/i, /remake/i, /promote/i, /losing momentum/i,
    ],
    keywords: ["video", "videos", "upload", "uploads", "thumbnail", "title", "views", "top", "best", "worst", "hurting", "promote", "remake"],
  },
  {
    intent: "youtube_channel",
    patterns: [
      /my channel/i, /subscriber/i, /channel (stat|overview|growth|health)/i,
      /how is my channel/i, /channel doing/i, /total views/i,
    ],
    keywords: ["channel", "subscribers", "subscriber", "growth", "overview", "health"],
  },
  {
    intent: "youtube_trends",
    patterns: [
      /trend/i, /drop(ped)?/i, /increas(e|ed|ing)/i, /decreas(e|ed|ing)/i,
      /compar(e|ison|ed)/i, /last (week|month)/i, /this (week|month)/i,
      /why did my/i, /what happened/i, /going (up|down)/i, /spike/i,
    ],
    keywords: ["trend", "drop", "dropped", "increase", "decrease", "compare", "comparison", "spike", "declined", "growing"],
  },
  {
    intent: "youtube_shorts",
    patterns: [
      /shorts?/i, /short.?form/i, /60.?sec/i, /vertical video/i,
    ],
    keywords: ["shorts", "short", "short-form"],
  },
  {
    intent: "youtube_audience",
    patterns: [
      /audience/i, /geograph/i, /demographic/i, /traffic source/i,
      /where (are|do) my (viewers|audience)/i, /returning viewer/i,
      /new viewer/i, /viewer/i,
    ],
    keywords: ["audience", "geography", "demographic", "traffic", "viewers", "returning"],
  },
  {
    intent: "content_strategy",
    patterns: [
      /content (strategy|plan|idea|calendar)/i, /what should I (make|create|upload|post)/i,
      /video idea/i, /script/i, /seo/i, /schedule/i, /collab/i,
      /niche/i, /brand deal/i, /sponsor/i, /growth/i,
    ],
    keywords: ["strategy", "ideas", "script", "seo", "schedule", "collaboration", "niche", "brand", "sponsor", "growth"],
  },
];

/**
 * Detect the primary intent from a user message.
 * Returns the most confident match, defaulting to "general" if no patterns match.
 */
export function detectIntent(message: string): AIIntent {
  const lowerMessage = message.toLowerCase();
  let bestMatch: { intent: AIIntent; score: number } = { intent: "general", score: 0 };

  for (const { intent, patterns, keywords } of INTENT_PATTERNS) {
    let score = 0;

    // Check regex patterns (weighted higher)
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        score += 3;
      }
    }

    // Check keywords
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        score += 1;
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { intent, score };
    }
  }

  return bestMatch.intent;
}

/**
 * Determine if the detected intent requires YouTube data.
 */
export function requiresYouTubeData(intent: AIIntent): boolean {
  return intent !== "general";
}

/**
 * Detect whether the message asks a platform-specific question requiring actual data.
 */
export function requiresPlatformData(message: string, intent: AIIntent): boolean {
  if (intent === "general") return false;
  
  const msg = message.toLowerCase();
  
  // Platform-specific keywords indicating the user is asking about their own metrics
  const hasMy = msg.includes("my") || msg.includes("mine") || msg.includes("i ") || msg.includes("i'm") || msg.includes("me ") || msg.includes("how am i");
  const isSpecificQuestion = msg.includes("latest") || msg.includes("recent") || msg.includes("underperforming") || msg.includes("perform") || msg.includes("growth") || msg.includes("revenue") || msg.includes("subscriber") || msg.includes("views") || msg.includes("ctr") || msg.includes("analytics") || msg.includes("audience") || msg.includes("video");

  // General advice checks (e.g. "what is ctr", "how to improve ctr")
  const isGeneralAdvice = (msg.includes("what is") || msg.includes("how to") || msg.includes("explain") || msg.includes("how do") || msg.includes("tips for") || msg.includes("advice")) && !msg.includes("my");

  if (isGeneralAdvice) {
    return false;
  }

  return hasMy || isSpecificQuestion;
}

/**
 * Get all data categories needed for a given intent.
 */
export function getRequiredDataCategories(intent: AIIntent): string[] {
  switch (intent) {
    case "youtube_channel":
      return ["channel", "recent_analytics"];
    case "youtube_videos":
      return ["channel", "videos", "video_metrics"];
    case "youtube_revenue":
      return ["channel", "revenue", "video_revenue"];
    case "youtube_analytics":
      return ["channel", "videos", "video_metrics", "daily_analytics"];
    case "youtube_trends":
      return ["channel", "daily_analytics", "videos"];
    case "youtube_shorts":
      return ["channel", "shorts"];
    case "youtube_audience":
      return ["channel", "daily_analytics"];
    case "content_strategy":
      return ["channel", "videos", "video_metrics"];
    default:
      return [];
  }
}
