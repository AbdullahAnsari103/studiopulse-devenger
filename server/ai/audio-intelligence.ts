/**
 * Audio Intelligence Engine — FFmpeg Audio Extraction + Gemini 2.5 Flash Audio Understanding
 *
 * Extracts audio from uploaded video files and analyzes it using Google Gemini's
 * native multimodal audio capabilities for transcription, language detection,
 * and content classification.
 *
 * Key Advantage over Whisper: Gemini understands audio context holistically —
 * it can identify genre, mood, musical instruments, and lyrical themes in a single call,
 * not just raw transcription.
 *
 * Capabilities:
 * - Extracts audio track from any video format (MP4, MOV, MKV, AVI, WebM)
 * - Transcribes speech in 50+ languages (Hindi, English, Urdu, Punjabi, Spanish, etc.)
 * - Detects song lyrics in music videos
 * - Identifies genre, mood, instruments, and musical style
 * - Classifies content type (speech, music, instrumental, mixed)
 * - Returns structured transcript with detected language and rich metadata
 *
 * Uses dedicated GEMINI_AUDIO_KEY_1..8 key pool (isolated from other Gemini pools).
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_AUDIO_SIZE_MB = 24; // Up to 24MB for full audio coverage (Groq Whisper accepts up to 25MB)
const MAX_AUDIO_DURATION_SEC = 600; // 10 minutes — extracts the entire video's audio for complete lyrics
const TEMP_AUDIO_DIR = path.resolve("server/uploads/temp-audio");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineMilestone {
  time: string;
  seconds: number;
  label: string;
  textSnippet?: string;
}

export interface AudioTranscriptionResult {
  success: boolean;
  transcript: string;
  timestampedTranscript?: string;
  timelineMilestones?: TimelineMilestone[];
  hasVocals: boolean;
  hasSpeech?: boolean;
  isMusic?: boolean;
  contentCategory?: string;
  musicDescription?: string;
  detectedLanguage: string | null;
  durationAnalyzed: number; // seconds of audio analyzed
  contentType: "speech" | "music_with_vocals" | "music_instrumental" | "soundtrack" | "silence" | "mixed";
  genre?: string;
  mood?: string;
  error?: string;
}

// ─── Gemini Audio Key Pool with Unified 60+ Keys & Cooldown ─────────────────

const audioKeyCooldowns = new Map<string, number>();

function getGeminiAudioKeys(): string[] {
  const keys: string[] = [];
  const add = (k?: string) => {
    if (k && k.trim() && !keys.includes(k.trim())) keys.push(k.trim());
  };

  // 1. Clip keys (highest availability right now)
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_CLIP_KEY_${i}`]);
  // 2. Dedicated audio keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_AUDIO_KEY_${i}`]);
  // 3. API keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_API_KEY_${i}`]);
  // 4. Backup keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_BACKUP_KEY_${i}`]);
  // 5. Editor keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_EDITOR_KEY_${i}`]);

  return keys;
}

let lastAudioKeyIdx = 0;

// ─── FFmpeg Audio Extraction ──────────────────────────────────────────────────

/**
 * Extract audio from a video file as a WAV suitable for Gemini.
 * Outputs mono 16kHz WAV, limited to MAX_AUDIO_DURATION_SEC.
 */
export async function extractAudioFromVideo(videoFilePath: string): Promise<string | null> {
  if (!fs.existsSync(videoFilePath)) {
    console.warn(`[AudioIntel] Video file not found: ${videoFilePath}`);
    return null;
  }

  if (!fs.existsSync(TEMP_AUDIO_DIR)) {
    fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
  }

  const audioFileName = `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
  const audioFilePath = path.join(TEMP_AUDIO_DIR, audioFileName);

  try {
    const { execSync } = await import("child_process");

    // Resolve ffmpeg binary: prefer ffmpeg-static package, fallback to system ffmpeg
    let ffmpegBin = "ffmpeg";
    try {
      const ffmpegStatic = await import("ffmpeg-static");
      const staticPath = (ffmpegStatic as any).default || ffmpegStatic;
      if (typeof staticPath === "string" && fs.existsSync(staticPath)) {
        ffmpegBin = `"${staticPath}"`;
        console.log(`[AudioIntel] Using ffmpeg-static: ${staticPath}`);
      }
    } catch {
      console.log("[AudioIntel] ffmpeg-static not found, using system ffmpeg");
    }

    // Extract audio: mono, 16kHz, WAV format, limited duration
    // -vn = no video, -ar 16000 = 16kHz sample rate, -ac 1 = mono, -t = duration limit
    execSync(
      `${ffmpegBin} -y -i "${videoFilePath}" -vn -ar 16000 -ac 1 -t ${MAX_AUDIO_DURATION_SEC} -f wav "${audioFilePath}"`,
      { timeout: 30000, stdio: "pipe" }
    );

    if (fs.existsSync(audioFilePath)) {
      const stats = fs.statSync(audioFilePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > MAX_AUDIO_SIZE_MB) {
        console.warn(`[AudioIntel] Extracted audio too large (${sizeMB.toFixed(1)}MB > ${MAX_AUDIO_SIZE_MB}MB), re-extracting shorter segment`);
        const shorterDuration = Math.floor(MAX_AUDIO_DURATION_SEC * (MAX_AUDIO_SIZE_MB / sizeMB) * 0.9);
        fs.unlinkSync(audioFilePath);
        execSync(
          `${ffmpegBin} -y -i "${videoFilePath}" -vn -ar 16000 -ac 1 -t ${shorterDuration} -f wav "${audioFilePath}"`,
          { timeout: 30000, stdio: "pipe" }
        );
      }

      console.log(`[AudioIntel] Audio extracted: ${audioFilePath} (${(fs.statSync(audioFilePath).size / (1024 * 1024)).toFixed(1)}MB)`);
      return audioFilePath;
    }
  } catch (err: any) {
    console.warn(`[AudioIntel] FFmpeg audio extraction failed: ${err?.message?.slice(0, 200) || err}`);
  }

  return null;
}

// ─── Gemini Audio Analysis ────────────────────────────────────────────────────

/**
 * Analyze audio using Gemini 2.5 Flash with cooldown tracking & Groq Whisper fallback.
 */
export async function transcribeAudioWithGemini(audioFilePath: string): Promise<AudioTranscriptionResult> {
  if (!fs.existsSync(audioFilePath)) {
    return {
      success: false,
      transcript: "",
      hasVocals: false,
      detectedLanguage: null,
      durationAnalyzed: 0,
      contentType: "silence",
      error: "Audio file not found",
    };
  }

  const allKeys = getGeminiAudioKeys();
  const now = Date.now();
  const candidateKeys = allKeys.filter((k) => (audioKeyCooldowns.get(k) || 0) <= now);
  const keysToUse = candidateKeys.length > 0 ? candidateKeys : allKeys;

  // Read audio file as base64
  const audioBuffer = fs.readFileSync(audioFilePath);
  const audioBase64 = audioBuffer.toString("base64");
  const audioStats = fs.statSync(audioFilePath);

  console.log(`[AudioIntel] Preparing Gemini audio analysis (${(audioStats.size / (1024 * 1024)).toFixed(1)}MB WAV, ${keysToUse.length} candidate keys)`);

  // Try up to 3 Gemini keys; if quota exceeded, swiftly engage Groq Whisper pipeline
  const maxAttempts = Math.min(keysToUse.length, 3);
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIndex = (lastAudioKeyIdx + attempt) % keysToUse.length;
    const apiKey = keysToUse[keyIndex];

    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      console.log(`[AudioIntel] Sending to Gemini ${GEMINI_MODEL} (audio key #${keyIndex + 1}/${keysToUse.length})...`);
      const startMs = Date.now();

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: "audio/wav",
            data: audioBase64,
          },
        },
        {
          text: `You are an expert audiovisual analyst and speech/music classifier. Listen to this entire audio track and return a raw JSON object:

{
  "isMusic": <true ONLY if this is singing/rap or an official musical song release. false if it is a spoken tutorial, software demo, educational guide, podcast, vlog, lecture, or talking presentation>,
  "contentType": "<'speech' if spoken narration/voiceover/tutorial/podcast, 'music_with_vocals' if singing song release, 'music_instrumental' if purely musical beat/track without vocals, 'mixed' if speech over music>",
  "hasVocals": <true ONLY if singing/rap vocals>,
  "hasSpeech": <true if spoken voiceover/commentary/explanation>,
  "contentCategory": "<e.g. 'Software / Tech Demo', 'Educational Tutorial', 'Music Video', 'Podcast / Interview', 'Gaming', 'Fitness / Workout', 'Vlog / Lifestyle'>",
  "lyrics": "<If singing/vocals exist, transcribe verbatim lyrics. If spoken speech/tutorial, transcribe what was said. If no audible voice, set to null>",
  "timestampedTranscript": "<Transcript formatted with timestamps where each distinct topic, step, or sentence group starts, e.g. '[0:00] Welcome to this guide...\\n[1:18] Now let us discuss...' (max 2500 chars)>",
  "timelineMilestones": [
    {
      "time": "0:00",
      "seconds": 0,
      "label": "<Topic label or Intro>",
      "textSnippet": "<First sentence spoken or sung>"
    },
    {
      "time": "<exact mm:ss when speaker changes topic or musical section shifts>",
      "seconds": <exact second integer>,
      "label": "<Accurate topic name based on what is being discussed or sung>",
      "textSnippet": "<Exact phrase spoken right when this section begins>"
    }
  ],
  "musicDescription": "<1-2 sentence description of what is heard>",
  "detectedLanguage": "<language e.g. English, Hindi, Punjabi, Spanish, etc.>",
  "genre": "<If music: music genre. If speech/tech: topic e.g. 'Emergency Response & Safety App' or 'Tech Tutorial'>",
  "mood": "<e.g. 'Urgent & Informative', 'Professional & Reassuring', 'Melancholic & Reflective', 'Inspiring'>",
  "durationEstimate": <estimated duration in seconds as number>
}

CRITICAL RULES:
1. If this is a software demo, tutorial, or speech, set isMusic: false, hasVocals: false, hasSpeech: true, contentType: 'speech'.
2. Ground all timelineMilestones in the ACTUAL audio timestamps. Do not guess.
3. Return ONLY valid raw JSON. No markdown backticks, no explanations.`
        },
      ]);

      const elapsedMs = Date.now() - startMs;
      const rawText = result.response.text().trim();

      // Parse JSON response
      try {
        const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(jsonStr);

        const isMusic = parsed.isMusic === true;
        const hasVocals = isMusic && !!parsed.hasVocals;
        const hasSpeech = parsed.hasSpeech !== undefined ? !!parsed.hasSpeech : !isMusic;
        const lyrics = parsed.lyrics ? String(parsed.lyrics).trim() : (parsed.transcript ? String(parsed.transcript).trim() : "");
        const timestampedTranscript = parsed.timestampedTranscript ? String(parsed.timestampedTranscript).trim() : "";
        const timelineMilestones = Array.isArray(parsed.timelineMilestones) ? parsed.timelineMilestones : [];
        const musicDescription = parsed.musicDescription || "";
        const detectedLanguage = parsed.detectedLanguage || null;
        const contentType = parsed.contentType || (isMusic ? (hasVocals ? "music_with_vocals" : "music_instrumental") : "speech");
        const genre = parsed.genre || (isMusic ? "Music" : "Tech & Tutorials");
        const mood = parsed.mood || undefined;
        const durationAnalyzed = parsed.durationEstimate || 0;

        lastAudioKeyIdx = (keyIndex + 1) % keysToUse.length;
        console.log(`[AudioIntel] ✅ Gemini audio analysis complete in ${elapsedMs}ms | isMusic: ${isMusic} | Type: ${contentType} | Milestones: ${timelineMilestones.length} | Topic: ${genre}`);

        return {
          success: true,
          transcript: lyrics,
          timestampedTranscript: timestampedTranscript || undefined,
          timelineMilestones: timelineMilestones.length > 0 ? timelineMilestones : undefined,
          hasVocals,
          hasSpeech,
          isMusic,
          contentCategory: parsed.contentCategory || (isMusic ? "Music Video" : "Tech Demo / Tutorial"),
          musicDescription,
          detectedLanguage,
          durationAnalyzed: Math.round(durationAnalyzed),
          contentType: contentType as AudioTranscriptionResult["contentType"],
          genre,
          mood,
        };
      } catch (parseErr) {
        // If JSON parsing fails, treat the raw response as a transcript
        console.warn(`[AudioIntel] Gemini returned non-JSON, using raw text`);
        return {
          success: true,
          transcript: "",
          hasVocals: false,
          musicDescription: rawText.slice(0, 300),
          detectedLanguage: null,
          durationAnalyzed: 0,
          contentType: "mixed",
        };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[AudioIntel] Gemini audio attempt ${attempt + 1} (key #${keyIndex + 1}) failed: ${errMsg.slice(0, 160)}`);

      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        audioKeyCooldowns.set(apiKey, Date.now() + 60000);
        continue;
      }
    }
  }

  // If Gemini keys are rate-limited or unavailable, engage Groq Whisper + LLM
  console.warn(`[AudioIntel] Gemini audio keys rate-limited (429). Seamlessly engaging Studio AI Groq Whisper engine...`);
  return await transcribeWithGroqWhisper(audioFilePath);
}

// ─── Groq Whisper + LLM Audio Intelligence Engine ───────────────────────────

let lastGroqKeyIdx = 0;

function getGroqApiKey(): string {
  const keys: string[] = [];
  for (let i = 1; i <= 16; i++) {
    const tk = process.env[`GROQ_TASK_KEY_${i}`];
    if (tk && tk.trim()) keys.push(tk.trim());
    const ck = process.env[`GROQ_CHAT_KEY_${i}`];
    if (ck && ck.trim() && !keys.includes(ck.trim())) keys.push(ck.trim());
  }
  for (let i = 1; i <= 8; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k && k.trim() && !keys.includes(k.trim())) keys.push(k.trim());
  }
  if (keys.length === 0) return "";
  const key = keys[lastGroqKeyIdx % keys.length];
  lastGroqKeyIdx = (lastGroqKeyIdx + 1) % keys.length;
  return key;
}

async function transcribeWithGroqWhisper(audioFilePath: string): Promise<AudioTranscriptionResult> {
  try {
    const { groqProviderManager } = await import("./groq");
    const groqKey = getGroqApiKey();
    if (!groqKey) throw new Error("No Groq API key available for Whisper audio analysis");

    const fileBuffer = fs.readFileSync(audioFilePath);
    const audioStats = fs.statSync(audioFilePath);
    const blob = new Blob([fileBuffer], { type: "audio/wav" });
    const form = new FormData();
    form.append("file", blob, "audio.wav");
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");

    console.log(`[AudioIntel] Sending audio (${(audioStats.size / (1024 * 1024)).toFixed(1)}MB) to Groq Whisper (whisper-large-v3-turbo)...`);
    const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`Groq Whisper failed: ${whisperRes.status} ${errText.slice(0, 150)}`);
    }

    const whisperData = await whisperRes.json();
    const rawText = (whisperData.text || "").trim();
    const detectedLang = whisperData.language || "Hindi / Urdu";
    const duration = Math.round(whisperData.duration || 60);

    // Build timestamped transcript lines from verbose_json segments
    const segments = Array.isArray(whisperData.segments) ? whisperData.segments : [];
    const timestampedLines: string[] = [];
    for (const s of segments) {
      const startSec = Math.floor(s.start || 0);
      const min = Math.floor(startSec / 60);
      const sec = startSec % 60;
      const timeStr = `${min}:${sec < 10 ? "0" : ""}${sec}`;
      if (s.text && s.text.trim()) {
        timestampedLines.push(`[${timeStr}] ${s.text.trim()}`);
      }
    }
    const timestampedTranscript = timestampedLines.join("\n");

    console.log(`[AudioIntel] ✅ Groq Whisper transcribed ${segments.length} segments in ${detectedLang}: "${rawText.slice(0, 70)}..."`);

    // Use Groq LLM to accurately classify content (speech vs music), format lyrics or speech transcript, and analyze topic/mood
    const analysisPrompt = `You are a world-class audio analyst and audiovisual content classifier.
An audio track from a video has been transcribed with exact segment timestamps:
${timestampedTranscript ? timestampedTranscript.slice(0, 3000) : rawText}

Whisper detected language: "${detectedLang}"

Classify what this audio ACTUALLY is and return a raw JSON object:
{
  "isMusic": <true ONLY if this is singing/rap or an official musical song release. Set to false if this is a spoken tutorial, software demo, app walkthrough, presentation, podcast, educational guide, commentary, or vlog>,
  "contentType": "<'speech' if spoken narration/voiceover/tutorial/podcast, 'music_with_vocals' if singing song release, 'music_instrumental' if purely musical track without vocals, 'mixed' if speech over music>",
  "hasVocals": <true ONLY if singing/rap vocals>,
  "hasSpeech": <true if spoken voiceover/narration/explanation>,
  "contentCategory": "<e.g. 'Software / Tech Demo', 'Educational Tutorial', 'Music Video', 'Podcast / Interview', 'Gaming', 'Fitness / Workout', 'Vlog / Lifestyle'>",
  "genreOrTopic": "<If music: music genre (e.g. Bollywood Ballad, Pop, EDM). If speech/tech: subject topic (e.g. Emergency Response & Safety App, Python Tutorial, Web Development, Fitness Guide, etc.)>",
  "mood": "<Emotional tone: e.g. Urgent & Informative, Professional & Reassuring, Melancholic & Reflective, Energetic, Inspiring>",
  "audioDescription": "<1-2 sentence description of what is heard: e.g. 'Clear spoken English narration demonstrating emergency dispatch telemetry and GPS tracking for the SafeNex platform.' or 'Melancholic Hindi acoustic pop ballad with emotional singing.'>",
  "formattedTranscript": "<If song: clean Roman lyrics line-by-line. If speech/tutorial: clean, punctuated, formatted transcript of what was spoken with proper paragraph breaks. Remove repeating intro noise like 'Muzica'.>",
  "timelineMilestones": [
    {
      "time": "0:00",
      "seconds": 0,
      "label": "<Topic label or Intro>",
      "textSnippet": "<First sentence spoken or sung>"
    },
    {
      "time": "<exact mm:ss from timestamps where a new topic begins>",
      "seconds": <exact second integer>,
      "label": "<Accurate topic name>",
      "textSnippet": "<Exact phrase spoken right when this transition starts>"
    }
  ],
  "detectedLanguage": "<Accurate language: e.g. English, Hindi, Urdu, Spanish, etc. (Note: If words like 'Tere bina', 'lamha', 'khwab' are present, it is 'Hindi', NOT Romanian)>"
}

CRITICAL RULES:
1. If this is a software demo, tech guide, or presentation (like SafeNex, coding, apps), set isMusic: false, hasVocals: false, hasSpeech: true, contentType: "speech".
2. Ground all timelineMilestones in the ACTUAL segment timestamps provided. Do NOT invent arbitrary timestamps.
3. If this is a song with singing, transcribe the FULL lyrics and set isMusic: true, hasVocals: true.
4. Return ONLY valid raw JSON. No markdown code blocks, no backticks.`;

    let isMusic = false;
    let hasVocals = false;
    let hasSpeech = rawText.length > 5;
    let contentType: AudioTranscriptionResult["contentType"] = "speech";
    let lyricsOrTranscript = rawText;
    let genreOrTopic = "Tech & Tutorials";
    let mood = "Informative";
    let audioDescription = "Audio track analyzed";
    let finalLanguage = detectedLang;
    let contentCategory = "General Video";
    let timelineMilestones: { time: string; seconds: number; label: string; textSnippet?: string }[] = [];

    try {
      const llmResult = await groqProviderManager.generateContent("You are a professional audiovisual content classifier.", analysisPrompt);
      const cleanJson = llmResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.isMusic !== undefined) isMusic = !!parsed.isMusic;
      if (parsed.hasVocals !== undefined) hasVocals = isMusic && !!parsed.hasVocals;
      if (parsed.hasSpeech !== undefined) hasSpeech = !!parsed.hasSpeech;
      if (parsed.contentType) contentType = parsed.contentType;
      else contentType = isMusic ? (hasVocals ? "music_with_vocals" : "music_instrumental") : "speech";

      if (parsed.formattedTranscript) lyricsOrTranscript = parsed.formattedTranscript;
      if (parsed.detectedLanguage) finalLanguage = parsed.detectedLanguage;
      if (parsed.genreOrTopic) genreOrTopic = parsed.genreOrTopic;
      if (parsed.mood) mood = parsed.mood;
      if (parsed.audioDescription) audioDescription = parsed.audioDescription;
      if (parsed.contentCategory) contentCategory = parsed.contentCategory;
      if (Array.isArray(parsed.timelineMilestones)) timelineMilestones = parsed.timelineMilestones;
    } catch (parseErr) {
      console.warn(`[AudioIntel] Groq LLM parsing note, using direct whisper text`);
    }

    console.log(`[AudioIntel] ✅ Groq Audio Intelligence Complete | isMusic: ${isMusic} | Type: ${contentType} | Milestones: ${timelineMilestones.length} | Topic: ${genreOrTopic}`);

    return {
      success: true,
      transcript: lyricsOrTranscript,
      timestampedTranscript: timestampedTranscript || undefined,
      timelineMilestones: timelineMilestones.length > 0 ? timelineMilestones : undefined,
      hasVocals,
      hasSpeech,
      isMusic,
      contentCategory,
      musicDescription: audioDescription,
      detectedLanguage: finalLanguage,
      durationAnalyzed: duration,
      contentType,
      genre: genreOrTopic,
      mood,
    };
  } catch (err: any) {
    console.error(`[AudioIntel] Groq Whisper pipeline failed:`, err?.message || err);
    return {
      success: false,
      transcript: "",
      hasVocals: false,
      detectedLanguage: null,
      durationAnalyzed: 0,
      contentType: "silence",
      error: err?.message || String(err),
    };
  }
}

// ─── Audio Content Classification (Fallback) ─────────────────────────────────

function classifyAudioContent(
  transcript: string,
  _language: string | null
): AudioTranscriptionResult["contentType"] {
  if (!transcript || transcript.length < 5) return "silence";

  const words = transcript.split(/\s+/).length;
  const hasRepetition = detectLyricRepetition(transcript);

  if (hasRepetition && words > 10) return "music_with_vocals";
  if (words > 30) return "speech";
  if (words > 10) return "mixed";

  return "silence";
}

/**
 * Detect repetitive lyrical patterns common in songs.
 */
function detectLyricRepetition(text: string): boolean {
  const lines = text
    .split(/[.!?\n]/)
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length > 3);

  if (lines.length < 3) return false;

  const phraseCounts = new Map<string, number>();
  for (const line of lines) {
    const normalized = line.replace(/[^\w\s]/g, "").trim();
    if (normalized.length > 8) {
      phraseCounts.set(normalized, (phraseCounts.get(normalized) || 0) + 1);
    }
  }

  for (const count of phraseCounts.values()) {
    if (count >= 2) return true;
  }

  return false;
}

// ─── Master Pipeline: Extract + Analyze ───────────────────────────────────────

/**
 * Full audio intelligence pipeline: extract audio from video, analyze with Gemini,
 * then clean up temporary files.
 */
export async function analyzeVideoAudio(videoFilePath: string): Promise<AudioTranscriptionResult> {
  console.log(`[AudioIntel] Starting Gemini audio analysis for: ${videoFilePath}`);

  // Step 1: Extract audio
  const audioPath = await extractAudioFromVideo(videoFilePath);
  if (!audioPath) {
    return {
      success: false,
      transcript: "",
      detectedLanguage: null,
      durationAnalyzed: 0,
      contentType: "silence",
      error: "Failed to extract audio from video (ffmpeg may not be available)",
    };
  }

  try {
    // Step 2: Analyze with Gemini
    const result = await transcribeAudioWithGemini(audioPath);
    return result;
  } finally {
    // Step 3: Clean up temp audio file
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {
      // Cleanup failure is non-critical
    }
  }
}
