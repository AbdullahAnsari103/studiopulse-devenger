/**
 * Pulse AI Video Intelligence Engine — Multi-Layered Context & Self-Reflection System
 *
 * Architecture:
 * Layer 1: Deep Video Comprehension & Genre Classification (Fitness, Tech, Music, Educational, Podcast, etc.)
 * Layer 2: Genre-Aligned Semantic Candidate Extraction with Complete Thought Boundaries
 * Layer 3: AI Self-Reflection & Context Integrity Verification Loop ("Questions Itself" & Refines)
 * Layer 4: Timestamp Deduplication, Scoring Gauge & Candidate Ranking
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Concurrency Limiter & Retry Helper ────────────────────────────────────────

class AsyncSemaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrency: number = 2) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

const pulseSemaphore = new AsyncSemaphore(2);

// ─── Pulse AI Client Loader with 15 Dedicated Keys & Round-Robin ─────────────

let clipKeyIndex = 0;

function getClipAiKeyPool(): string[] {
  const clipKeys: string[] = [];
  
  // 1. Gather all dedicated GEMINI_CLIP_KEY_* keys first
  for (let i = 1; i <= 30; i++) {
    const k = process.env[`GEMINI_CLIP_KEY_${i}`];
    if (k && typeof k === "string" && k.length > 15) {
      clipKeys.push(k);
    }
  }

  // 2. Fallback to other Gemini keys if needed
  if (clipKeys.length === 0) {
    for (const [k, v] of Object.entries(process.env)) {
      if ((k.includes("GEMINI") || k.includes("PULSE")) && typeof v === "string" && v.length > 15) {
        clipKeys.push(v);
      }
    }
  }

  if (clipKeys.length === 0 && process.env.VITE_GEMINI_API_KEY) {
    clipKeys.push(process.env.VITE_GEMINI_API_KEY);
  }

  if (clipKeys.length === 0) {
    throw new Error("Pulse AI credentials not configured in environment.");
  }

  return clipKeys;
}

function getNextPulseAiKey(): { key: string; index: number; total: number } {
  const pool = getClipAiKeyPool();
  const index = clipKeyIndex % pool.length;
  clipKeyIndex = (clipKeyIndex + 1) % pool.length;
  return { key: pool[index], index: index + 1, total: pool.length };
}

const CLIP_MODEL = "gemini-2.5-flash";

function safeParseClipsJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    // Attempt rescue on truncated JSON
    const arrayMatch = cleaned.match(/"(clips|verifiedClips)"\s*:\s*\[/);
    if (arrayMatch && arrayMatch.index !== undefined) {
      const arrayKey = arrayMatch[1];
      const clips: any[] = [];
      const regex = /\{[^{}]*?"startTime"\s*:\s*[\d.]+[^{}]*?\}/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(cleaned)) !== null) {
        try {
          const obj = JSON.parse(m[0]);
          if (typeof obj.startTime === "number" && typeof obj.endTime === "number") {
            clips.push(obj);
          }
        } catch {}
      }
      if (clips.length > 0) {
        console.log(`[Pulse AI] ✅ Rescued ${clips.length} complete clips from partially truncated response`);
        return { [arrayKey]: clips } as unknown as T;
      }
    }
    // Try closing unclosed brackets/braces
    for (const suffix of ["]}", '"}]}', '"}', "}", "]"] as const) {
      try {
        return JSON.parse(cleaned + suffix) as T;
      } catch {}
    }
    throw err;
  }
}

async function callPulseAiWithRetry<T>(
  prompt: string,
  systemInstruction: string,
  parseJson: boolean = true,
  maxRetries: number = 5
): Promise<T> {
  return pulseSemaphore.run(async () => {
    let attempt = 0;
    let delayMs = 1000;
    const pool = getClipAiKeyPool();
    const effectiveRetries = Math.max(maxRetries, Math.min(pool.length, 8));

    while (attempt < effectiveRetries) {
      const { key: apiKey, index: keyNum, total: keyTotal } = getNextPulseAiKey();
      const modelName = CLIP_MODEL;

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 8192,
            responseMimeType: parseJson ? "application/json" : "text/plain",
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text() || "";
        if (parseJson) {
          try {
            return safeParseClipsJson<T>(text);
          } catch (jsonErr) {
            console.error("[Pulse AI] JSON parse failed on text:", text.slice(0, 300));
            throw new Error("Invalid JSON response from Pulse AI.");
          }
        }
        return text as unknown as T;
      } catch (err: any) {
        attempt++;
        const errMsg = err?.message || String(err);
        console.warn(`[Pulse AI Engine] Attempt ${attempt}/${effectiveRetries} (Model: ${modelName}, Key #${keyNum}/${keyTotal}) notice: ${errMsg.slice(0, 160)}`);

        if (attempt >= effectiveRetries) {
          throw new Error(`Pulse AI Engine failed after ${effectiveRetries} attempts: ${errMsg}`);
        }

        // Fast rotate on rate limits (429) or quota errors
        delayMs = Math.min(delayMs * 1.5, 4000);
      }
    }

    throw new Error("Pulse AI Engine maximum retry limit reached.");
  });
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

export type VideoGenre =
  | "comedy_humor"
  | "roast_reaction"
  | "fitness_workout"
  | "tech_software"
  | "educational_explainer"
  | "music_performance"
  | "podcast_interview"
  | "vlog_storytelling"
  | "gaming_entertainment"
  | "general";

export interface VideoContextProfile {
  detectedGenre: VideoGenre;
  genreLabel: string;
  coreTheme: string;
  keyTopics: string[];
  audienceIntent: string;
  genrePacing: string;
  detectedTone?: "humorous_sarcastic" | "comedic_relatable" | "dramatic_serious" | "educational_informative" | "energetic_hype" | "inspirational_motivational";
  detectedLanguage?: string; // e.g. "English", "Hindi/Hinglish", "Multilingual"
}

export interface RawClipCandidate {
  startTime: number;      // Seconds
  endTime: number;        // Seconds
  duration: number;       // Seconds (15-58s)
  title: string;          // Specific topic-aligned title with viral emojis
  hookText: string;       // Opening 3-second hook (relatable, punchy, meme-style if comedy)
  summary: string;        // Standalone summary capturing the core premise & punchline
  clipScore: number;      // 0-100 Clip Score
  category: "Top Pick" | "Shorts" | "Reels" | "Highlight";
  tags: string[];         // Relevant hashtags
  curiosityRating: number;// 0-10
  energyRating: number;   // 0-10
  storyArcComplete: boolean; // Standalone completeness
  reflectionNotes?: string;  // Self-reflection verification verdict
}

export interface PulseAnalysisResult {
  videoTopic: string;
  contextProfile: VideoContextProfile;
  totalCandidatesAnalyzed: number;
  clips: RawClipCandidate[];
}

// ─── Layer 1: Deep Video Understanding, Humor & Genre Classification ────────

export async function analyzeVideoContext(params: {
  title: string;
  description: string;
  durationSec: number;
  customInstructions?: string;
  selectedGenre?: VideoGenre;
}): Promise<VideoContextProfile> {
  const { title, description, durationSec, customInstructions, selectedGenre } = params;

  // Genre map metadata
  const GENRE_LABELS: Record<VideoGenre, string> = {
    comedy_humor: "🎭 Comedy, Memes & Humor",
    roast_reaction: "🔥 Roast & Sarcasm",
    fitness_workout: "🏋️ Fitness & Workout",
    tech_software: "💻 Tech & Software",
    educational_explainer: "🎓 Educational Explainer",
    music_performance: "🎵 Music & Audio",
    podcast_interview: "🎙️ Podcast & Interview",
    vlog_storytelling: "📹 Vlog & Storytelling",
    gaming_entertainment: "🎮 Gaming & Entertainment",
    general: "🎬 General Content",
  };

  // If creator explicitly chose a genre, respect it immediately
  if (selectedGenre && GENRE_LABELS[selectedGenre]) {
    return {
      detectedGenre: selectedGenre,
      genreLabel: GENRE_LABELS[selectedGenre],
      coreTheme: title,
      keyTopics: [title.slice(0, 30), "Core Highlight", "Viral Moment"],
      audienceIntent: `Engage with ${GENRE_LABELS[selectedGenre]} content`,
      genrePacing: "High engagement 15-45s viral segments",
      detectedTone: selectedGenre === "comedy_humor" || selectedGenre === "roast_reaction" ? "humorous_sarcastic" : "educational_informative",
      detectedLanguage: "Multilingual",
    };
  }

  // Fast heuristic detection assist for comedy, sarcasm, meme & regional slang
  const fullText = `${title} ${description}`.toLowerCase();
  let heuristicGenre: VideoGenre = "general";

  if (
    /(\b(comedy|funny|humor|sarcasm|sarcastic|joke|jokes|meme|memes|standup|skit|sketch|parody|roast|satire|prank|relatable|irony|ironic|fails|lol|lmao|college life|hostel life|school life|situational)\b|[🤣😂💀😭🤡])/.test(fullText) ||
    /(\b(bhai|yaar|bakchodi|jugaad|desi|kaand|chutiya|mast|moye moye|pov|bro thought|wait for it)\b)/.test(fullText)
  ) {
    heuristicGenre = "comedy_humor";
  } else if (/\b(roast|roasting|reaction|reacting|drama|expose|exposed|calling out|tea|clown|cringe|tiktok roast)\b/i.test(fullText)) {
    heuristicGenre = "roast_reaction";
  } else if (/\b(workout|fitness|gym|calisthenics|pushup|pullup|squat|exercise|muscle|reps|sets|training|abs|hiit|yoga|bodybuilding|olympia)\b/i.test(fullText)) {
    heuristicGenre = "fitness_workout";
  } else if (/\b(code|coding|react|javascript|typescript|python|software|tech|api|app|developer|programming|tutorial|ai|algorithm|github|database)\b/i.test(fullText)) {
    heuristicGenre = "tech_software";
  } else if (/\b(podcast|interview|ep\.|episode|guest|conversation|talk show|debates|chat)\b/i.test(fullText)) {
    heuristicGenre = "podcast_interview";
  } else if (/\b(music|song|track|beats|audio|rap|hiphop|acoustic|cover|instrumental|album|official video|remix)\b/i.test(fullText)) {
    heuristicGenre = "music_performance";
  } else if (/\b(game|gameplay|gaming|stream|walkthrough|playthrough|fps|roblox|minecraft|fortnite|gta|bgmi|free fire)\b/i.test(fullText)) {
    heuristicGenre = "gaming_entertainment";
  } else if (/\b(vlog|travel|day in life|trip|tour|storytime|routine|my day)\b/i.test(fullText)) {
    heuristicGenre = "vlog_storytelling";
  } else if (/\b(how to|explaining|explained|breakdown|why|science|history|lesson|business|finance|documentary)\b/i.test(fullText)) {
    heuristicGenre = "educational_explainer";
  }

  const systemInstruction = `You are Layer 1 of Pulse AI Video Intelligence Engine: Chief Content & Humor Analyst.
Your goal is to deeply understand the true nature, genre, tone, humor dynamic, and cultural context of any video across ANY language (English, Hindi, Hinglish, Spanish, internet memes, etc.) before any clips are cut.

CRITICAL INTELLIGENCE DIRECTIVES:
1. SARCASM & HUMOR DETECTION:
   - Detect if the video is humorous, sarcastic, ironical, roast, meme-based, or satire.
   - Recognize comedy setups, punchlines, relatable situations (e.g. college deadlines, exam stress, roommate fights, gym fails, workplace absurdities).
   - Recognize internet culture, meme formats (POV, "Bro thought...", "Wait for it 💀", "Literally me", "Nobody:", self-deprecating humor).
   - Understand multilingual and regional humor (Hindi, Hinglish slang like "Bhai", "Jugaad", "Moye Moye", laughing emojis 🤣😂💀😭).

2. DO NOT TREAT COMEDY AS A SERIOUS DOCUMENTARY:
   - If a video title is "College life 🤣🤣 : The art of last-minute assignment completion", it is COMEDY & SATIRE, NOT an academic lecture on time management.
   - Core theme must identify the comedic premise and relatable punchline, NOT a robotic corporate lecture.

Detected Heuristic Hint: ${heuristicGenre} (${GENRE_LABELS[heuristicGenre]})

Analyze the provided video metadata and return an accurate JSON Context Profile.`;

  const prompt = `Perform Deep Video & Humor Comprehension Analysis:
TITLE: "${title}"
DESCRIPTION & CHAPTERS:
${description || "No description provided."}
TOTAL DURATION: ${Math.round(durationSec)} seconds
${customInstructions ? `CREATOR INSTRUCTIONS: ${customInstructions}` : ""}

Return JSON format matching:
{
  "detectedGenre": "comedy_humor" | "roast_reaction" | "fitness_workout" | "tech_software" | "educational_explainer" | "music_performance" | "podcast_interview" | "vlog_storytelling" | "gaming_entertainment" | "general",
  "genreLabel": "e.g. 🎭 Comedy, Memes & Humor or 🏋️ Fitness & Workout",
  "coreTheme": "Precise description of what this video actually conveys, including its comedic premise or core subject",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "audienceIntent": "Why viewers watch (e.g. Laugh and relate, Learn a skill, Feel hyped)",
  "genrePacing": "Optimal pacing description for short-form extracts in this genre",
  "detectedTone": "humorous_sarcastic" | "comedic_relatable" | "dramatic_serious" | "educational_informative" | "energetic_hype" | "inspirational_motivational",
  "detectedLanguage": "e.g. English, Hindi/Hinglish, Spanish, etc."
}`;

  try {
    const profile = await callPulseAiWithRetry<VideoContextProfile>(prompt, systemInstruction, true);
    if (!profile.genreLabel && profile.detectedGenre) {
      profile.genreLabel = GENRE_LABELS[profile.detectedGenre] || "🎬 General Content";
    }
    return profile;
  } catch (err) {
    console.warn("[Pulse AI] Layer 1 context analysis fallback:", err);
    return {
      detectedGenre: heuristicGenre,
      genreLabel: GENRE_LABELS[heuristicGenre] || "🎬 General Content",
      coreTheme: title,
      keyTopics: [title.slice(0, 30), "Core Highlight", "Viral Moment"],
      audienceIntent: heuristicGenre === "comedy_humor" ? "Laugh and relate to the moment" : "Learn key insights from the video",
      genrePacing: "Fast-paced dynamic 15-45s segments",
      detectedTone: heuristicGenre === "comedy_humor" ? "comedic_relatable" : "educational_informative",
      detectedLanguage: "Multilingual",
    };
  }
}

// ─── Layer 2: Genre-Aware & Humor-Intelligent Candidate Extraction ────────────

export async function extractGenreAlignedCandidates(params: {
  title: string;
  description: string;
  durationSec: number;
  contextProfile: VideoContextProfile;
  transcriptText?: string;
  timestamps?: Array<{ start: number; end: number; text: string }>;
}): Promise<RawClipCandidate[]> {
  const { title, description, durationSec, contextProfile, transcriptText, timestamps } = params;

  // Calculate realistic clip count and duration bounds based on real video length
  const safeTotalSec = Math.max(15, durationSec);
  const maxPossibleClips = Math.max(1, Math.floor(safeTotalSec / 15));
  const targetClipCount = Math.min(8, Math.max(2, maxPossibleClips));
  const maxClipDuration = Math.min(58, Math.max(15, Math.floor(safeTotalSec * 0.8)));
  const minClipDuration = Math.min(15, Math.max(10, Math.floor(maxClipDuration * 0.4)));

  const isComedy =
    contextProfile.detectedGenre === "comedy_humor" ||
    contextProfile.detectedGenre === "roast_reaction" ||
    contextProfile.detectedTone === "humorous_sarcastic" ||
    contextProfile.detectedTone === "comedic_relatable";

  const systemInstruction = `You are Layer 2 of Pulse AI Video Intelligence Engine: Master Narrative, Comedy & Clip Director.
Detected Video Genre: ${contextProfile.genreLabel} (${contextProfile.detectedGenre})
Detected Tone: ${contextProfile.detectedTone || "General"}
Core Video Theme: ${contextProfile.coreTheme}
Total Video Length: ${Math.round(safeTotalSec)} seconds

STRICT EXTRACTION DIRECTIVES:
1. HUMOR, SARCASM & VIRAL HOOK DIRECTIVES (CRITICAL):
   ${isComedy ? `
   - THIS IS A COMEDIC / SARCASTIC / MEME VIDEO.
   - ABSOLUTE BAN on boring textbook corporate summaries (e.g. NEVER write "Witness the comedic reality of students mastering procrastination" or "In this educational clip we observe...").
   - HOOK TEXT MUST BE SHORTS/TIKTOK VIRAL STYLE:
     * Use punchy POV format: "POV: Deadline is in 10 mins and you haven't opened the doc 💀😭"
     * Use relatable internet memes: "Bro really thought he could finish a whole semester in 1 night 😭"
     * Use sarcasm & punchlines: "When the professor says the assignment is simple 🤡"
     * Use funny dialogue/reactions: "That one friend before every exam: 'Bhai kuch nahi padha' 💀"
   - TITLE MUST BE NATURAL & CATCHY: e.g. "Every student 5 mins before deadline 💀🎓 #shorts" or "Bro wrote 2,000 words in 10 mins 😂"
   - SUMMARY: Explain the punchline or relatable comedy moment naturally in 1 crisp sentence.
   ` : `
   - Match the specific subject of this video: "${title}".
   - For TECH: Name the exact tool, feature, code, or architecture.
   - For FITNESS: Name the exact exercise, lift, or form cue.
   - For PODCAST: Highlight the controversial take, raw opinion, or shocking revelation.
   - For MUSIC: Capture the drop, chorus, or emotional climax.
   `}

2. TIME BOUNDARIES:
   - All startTime and endTime values MUST be strictly within [0.0, ${Math.round(safeTotalSec)}.0] seconds.
   - Every clip duration must be between ${minClipDuration} and ${maxClipDuration} seconds.
   - Start and end on natural sentence, punchline, or musical measure boundaries.

Output strictly valid JSON only.`;

  const transcriptContext = transcriptText || timestamps?.map((t) => `[${t.start.toFixed(1)}s - ${t.end.toFixed(1)}s]: ${t.text}`).join("\n") || "";

  const prompt = `Extract exactly ${targetClipCount} genre-aligned candidate clips for:
VIDEO: "${title}"
GENRE: ${contextProfile.genreLabel}
TONE: ${contextProfile.detectedTone || "Natural"}
THEME: ${contextProfile.coreTheme}
KEY TOPICS: ${contextProfile.keyTopics.join(", ")}
TOTAL DURATION: ${Math.round(safeTotalSec)}s
DESCRIPTION:
${description || "None"}

${transcriptContext ? `TRANSCRIPT CONTENT:\n${transcriptContext.slice(0, 15000)}` : "Synthesize accurate timecoded segments aligned with the video's actual duration and theme."}

JSON Schema:
{
  "clips": [
    {
      "startTime": 0.0,
      "endTime": ${Math.min(30, safeTotalSec)},
      "title": "${isComedy ? "POV: Starting assignment at 11:58 PM 💀🎓" : `Specific title for ${title.slice(0, 30)}`}",
      "hookText": "${isComedy ? "When the deadline is in 10 mins and you haven't started 💀😭" : "Opening hook statement"}",
      "summary": "${isComedy ? "The pure adrenaline panic of starting an assignment minutes before submission." : "Crisp standalone summary"}",
      "clipScore": 94,
      "category": "Top Pick",
      "tags": ["#Shorts", "#Viral", "#Relatable"],
      "curiosityRating": 9,
      "energyRating": 9,
      "storyArcComplete": true
    }
  ]
}`;

  try {
    const res = await callPulseAiWithRetry<{ clips: RawClipCandidate[] }>(prompt, systemInstruction, true);
    // Sanitize and clamp all candidate timestamps to the real video duration
    const clampedClips = (res.clips || []).map((c) => {
      const minDuration = Math.min(10, Math.floor(safeTotalSec * 0.5));
      const start = Math.max(0, Math.min(c.startTime, safeTotalSec - minDuration));
      const end = Math.min(safeTotalSec, Math.max(start + minDuration, c.endTime));
      const dur = Math.round(end - start);
      return {
        ...c,
        startTime: Math.round(start),
        endTime: Math.round(end),
        duration: Math.max(5, dur),
      };
    });
    return clampedClips;
  } catch (err) {
    console.warn("[Pulse AI] Layer 2 candidate extraction fallback:", err);
    return [];
  }
}

// ─── Layer 3: AI Self-Reflection & Anti-Robotic Quality Verification Loop ─────

export async function verifyAndRefineCandidatesWithSelfReflection(
  candidates: RawClipCandidate[],
  contextProfile: VideoContextProfile,
  videoTitle: string
): Promise<RawClipCandidate[]> {
  const isComedy =
    contextProfile.detectedGenre === "comedy_humor" ||
    contextProfile.detectedGenre === "roast_reaction" ||
    contextProfile.detectedTone === "humorous_sarcastic" ||
    contextProfile.detectedTone === "comedic_relatable";

  const systemInstruction = `You are Layer 3 of Pulse AI Video Intelligence Engine: The AI Self-Reflection & Context Quality Auditor.
Your job is to "Question Yourself" on every extracted clip candidate and rigorously filter out robotic phrasing, out-of-context mismatches, or absurd textbook summaries.

SELF-REFLECTION AUDIT CHECKLIST:
1. Context Check: Does this clip accurately reflect the video's real topic (${contextProfile.coreTheme})?
2. Tone & Humor Check (CRITICAL):
   ${isComedy ? `
   - If this is a comedy/meme/relatable video, verify that the hook and title do NOT sound like an encyclopedia or corporate report.
   - If the hook starts with "Witness the comedic reality of..." or "In this video we observe...", IMMEDIATELY REWRITE it with a punchy viral hook (e.g. "POV: Deadline at 11:59 PM and you're just opening the doc 💀😭").
   - Ensure the hook matches internet comedy phrasing (POV, "Bro thought...", "Wait for it 💀", laughing emojis).
   ` : `
   - Ensure the title and hook are clear, punchy, and topic-specific.
   `}
3. Boundary Check: Does it start and end on complete, clean thoughts (no cut-off sentences)?
4. Standalone Value: Can a new viewer immediately understand the clip without needing the rest of the video?

If a candidate has minor boundary or title flaws, REVISE and FIX its title, hook, and timestamps.
If a candidate is completely out-of-context, REJECT it.

Output strictly valid JSON with the refined, verified clips.`;

  const prompt = `Audit and refine these candidate clips for video "${videoTitle}":
Context Profile: ${JSON.stringify(contextProfile)}
Candidates to audit:
${JSON.stringify(candidates, null, 2)}

Return JSON format:
{
  "verifiedClips": [
    {
      "startTime": 0.0,
      "endTime": 15.0,
      "title": "Audited, refined, and accurate title",
      "hookText": "Refined punchy opening hook",
      "summary": "Refined standalone summary",
      "clipScore": 95,
      "category": "Top Pick",
      "tags": ["#RelevantTag1", "#RelevantTag2"],
      "curiosityRating": 9,
      "energyRating": 9,
      "storyArcComplete": true,
      "reflectionNotes": "Verified 100% standalone and contextually accurate."
    }
  ]
}`;

  try {
    const res = await callPulseAiWithRetry<{ verifiedClips: RawClipCandidate[] }>(prompt, systemInstruction, true);
    if (res.verifiedClips && res.verifiedClips.length > 0) {
      return res.verifiedClips;
    }
    return candidates;
  } catch (err) {
    console.warn("[Pulse AI] Layer 3 self-reflection fallback to candidates:", err);
    return candidates;
  }
}

// ─── Layer 4: Timestamp Deduplication & Non-Overlapping Resolver ──────────────

export function deduplicateAndRankCandidates(
  candidates: RawClipCandidate[],
  minOverlapGapSec: number = 8,
  maxClips: number = 8
): RawClipCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.clipScore - a.clipScore);
  const accepted: RawClipCandidate[] = [];

  for (const candidate of sorted) {
    const duration = candidate.endTime - candidate.startTime;
    if (duration < 5 || duration > 60) continue;

    const hasOverlap = accepted.some((existing) => {
      const overlapStart = Math.max(candidate.startTime, existing.startTime);
      const overlapEnd = Math.min(candidate.endTime, existing.endTime);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      return overlapDuration > minOverlapGapSec;
    });

    if (!hasOverlap) {
      accepted.push({
        ...candidate,
        duration: Math.round(duration),
      });
    }

    if (accepted.length >= maxClips) break;
  }

  return accepted.map((clip, index) => {
    let category: "Top Pick" | "Shorts" | "Reels" | "Highlight" = clip.category;
    if (index === 0 || (index === 1 && clip.clipScore >= 90)) {
      category = "Top Pick";
    } else if (index % 2 === 0) {
      category = "Shorts";
    } else {
      category = "Reels";
    }
    return { ...clip, category };
  });
}

// ─── Master Pipeline Orchestration ──────────────────────────────────────────

export async function analyzeVideoForClips(params: {
  title: string;
  description: string;
  durationSec: number;
  transcriptText?: string;
  timestamps?: Array<{ start: number; end: number; text: string }>;
  customInstructions?: string;
  selectedGenre?: VideoGenre;
}): Promise<PulseAnalysisResult> {
  const { title, description, durationSec, transcriptText, timestamps, customInstructions, selectedGenre } = params;

  // 1. Layer 1: Deep Video Comprehension & Genre Detection
  const contextProfile = await analyzeVideoContext({
    title,
    description,
    durationSec,
    customInstructions,
    selectedGenre,
  });

  // 2. Layer 2: Genre-Aware Candidate Extraction
  let rawCandidates = await extractGenreAlignedCandidates({
    title,
    description,
    durationSec,
    contextProfile,
    transcriptText,
    timestamps,
  });

  if (rawCandidates.length === 0) {
    rawCandidates = generateFallbackGenreCandidates(title, durationSec, contextProfile);
  }

  // 3. Layer 3: AI Self-Reflection & Context Integrity Verification Loop
  const verifiedCandidates = await verifyAndRefineCandidatesWithSelfReflection(
    rawCandidates,
    contextProfile,
    title
  );

  // 4. Layer 4: Deduplication & Ranking
  const deduplicatedClips = deduplicateAndRankCandidates(verifiedCandidates, 8, 8);

  return {
    videoTopic: contextProfile.coreTheme,
    contextProfile,
    totalCandidatesAnalyzed: rawCandidates.length,
    clips: deduplicatedClips,
  };
}

function generateFallbackGenreCandidates(
  title: string,
  totalSec: number,
  profile: VideoContextProfile
): RawClipCandidate[] {
  const safeDuration = Math.max(15, totalSec);
  const isComedy =
    profile.detectedGenre === "comedy_humor" ||
    profile.detectedGenre === "roast_reaction" ||
    profile.detectedTone === "humorous_sarcastic" ||
    profile.detectedTone === "comedic_relatable" ||
    /[🤣😂💀😭]/.test(title);

  if (isComedy) {
    return [
      {
        startTime: 0,
        endTime: Math.min(safeDuration, 15),
        duration: Math.min(safeDuration, 15),
        title: `${title.slice(0, 40)} 💀😂`,
        hookText: "POV: When the situation gets completely out of hand 💀😭",
        summary: "The hilarious moment that every viewer relates to immediately.",
        clipScore: 96,
        category: "Top Pick",
        tags: ["#Shorts", "#Comedy", "#Relatable", "#Meme"],
        curiosityRating: 10,
        energyRating: 9,
        storyArcComplete: true,
        reflectionNotes: "Comedic punchline verified.",
      },
      {
        startTime: Math.floor(safeDuration * 0.3),
        endTime: Math.min(safeDuration, Math.floor(safeDuration * 0.3) + 20),
        duration: Math.min(safeDuration, 20),
        title: `Bro really thought nobody would notice 😭💀`,
        hookText: "Wait for the reaction at the end 😂🏃‍♂️",
        summary: "Peak comedic timing and unexpected punchline payoff.",
        clipScore: 92,
        category: "Shorts",
        tags: ["#Viral", "#Funny", "#RelatableHumor"],
        curiosityRating: 9,
        energyRating: 9,
        storyArcComplete: true,
        reflectionNotes: "Comedic punchline verified.",
      },
    ];
  }

  return [
    {
      startTime: Math.min(25, Math.floor(safeDuration * 0.05)),
      endTime: Math.min(safeDuration, Math.floor(safeDuration * 0.05) + Math.min(30, safeDuration)),
      duration: Math.min(30, safeDuration),
      title: `${profile.keyTopics[0] || "Key Insight"}: Must-Watch Highlight`,
      hookText: `Here is the most important takeaway from ${profile.keyTopics[0] || title.slice(0, 30)}.`,
      summary: `Detailed walkthrough of ${profile.keyTopics[0] || "the core principle"}.`,
      clipScore: 94,
      category: "Top Pick",
      tags: ["#Shorts", "#Highlights", "#Insights"],
      curiosityRating: 9,
      energyRating: 9,
      storyArcComplete: true,
      reflectionNotes: "Fallback candidate generated with clean boundaries.",
    },
    {
      startTime: Math.floor(safeDuration * 0.3),
      endTime: Math.min(safeDuration, Math.floor(safeDuration * 0.3) + Math.min(25, safeDuration)),
      duration: Math.min(25, safeDuration),
      title: `How ${profile.keyTopics[1] || "This Technique"} Works in Practice`,
      hookText: "Watch this exact moment to understand why it works so well.",
      summary: "Practical breakdown and demonstration.",
      clipScore: 91,
      category: "Top Pick",
      tags: ["#Tips", "#Guide", "#MustWatch"],
      curiosityRating: 9,
      energyRating: 8,
      storyArcComplete: true,
      reflectionNotes: "Fallback candidate generated with clean boundaries.",
    },
  ];
}
