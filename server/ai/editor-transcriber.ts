/**
 * Editor Transcriber
 * 
 * Uses the dedicated GEMINI_EDITOR_KEY_ pool (16 keys) to transcribe video
 * audio with word-level timestamps. Detects silence and filler words.
 * 
 * This is isolated from the Vision Engine (GEMINI_API_KEY_) and
 * Fallback Pool (GEMINI_BACKUP_KEY_) to prevent cross-contamination.
 */

import fs from 'fs';
import path from 'path';
import { jobQueue } from '../utils/job-queue.js';
import { extractAudio } from './editor-render.js';


// ─── Gemini Editor Key Pool ─────────────────────────────────────────────────

function getEditorGeminiKey(): string {
  const keys: string[] = [];
  for (let i = 1; i <= 30; i++) {
    const k = process.env[`GEMINI_EDITOR_KEY_${i}`];
    if (k?.trim()) keys.push(k.trim());
  }
  if (keys.length === 0) throw new Error('No GEMINI_EDITOR_KEY_ keys configured. Add GEMINI_EDITOR_KEY_1 through GEMINI_EDITOR_KEY_N to .env');
  return keys[Math.floor(Math.random() * keys.length)];
}

// ─── Filler word detection ───────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically', 'literally',
  'actually', 'honestly', 'right', 'so', 'well', 'kind of', 'sort of',
  'i mean', 'you see', 'the thing is', 'at the end of the day',
]);

function detectFillerWords(words: Array<{ word: string; start: number; end: number }>): Array<{ word: string; start: number; end: number; isFiller: boolean }> {
  return words.map(w => ({
    ...w,
    isFiller: FILLER_WORDS.has(w.word.toLowerCase().replace(/[^a-z ]/g, '')),
  }));
}

// ─── Transcribe using Gemini ─────────────────────────────────────────────────

export interface TranscriptionResult {
  fullText: string;
  segments: Array<{
    id: string;
    text: string;
    start: number;
    end: number;
    words: Array<{ word: string; start: number; end: number; confidence: number; isFiller?: boolean; isSilence?: boolean }>;
    speaker?: string;
  }>;
  language: string;
  duration: number;
  silenceRegions: Array<{ start: number; end: number; duration: number }>;
  fillerWords: Array<{ word: string; start: number; end: number; isFiller: boolean }>;
}

export async function transcribeVideo(
  videoPath: string,
  uploadDir: string,
  jobId: string
): Promise<TranscriptionResult> {
  jobQueue.update(jobId, { status: 'processing', progress: 5, message: 'Extracting audio…' });

  // 1. Extract audio from video
  let audioPath: string;
  try {
    audioPath = await extractAudio(videoPath, uploadDir);
  } catch (err) {
    // If FFmpeg not available, attempt direct Gemini on video
    audioPath = videoPath;
    console.warn('[Transcriber] Could not extract audio, attempting direct video transcription');
  }

  jobQueue.update(jobId, { progress: 20, message: 'Sending to Gemini for transcription…' });

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const key = getEditorGeminiKey();
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Read audio file as base64
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBase64 = audioBuffer.toString('base64');
  const mimeType = audioPath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

  const prompt = `You are a professional audio transcription engine.

Transcribe the following audio completely and accurately.

Return ONLY valid JSON in this exact format:
{
  "language": "en",
  "duration": 120.5,
  "fullText": "Complete transcript text here",
  "segments": [
    {
      "id": "seg_0",
      "text": "Hello everyone welcome back",
      "start": 0.0,
      "end": 2.3,
      "words": [
        { "word": "Hello", "start": 0.0, "end": 0.4, "confidence": 0.98 },
        { "word": "everyone", "start": 0.5, "end": 1.1, "confidence": 0.97 }
      ]
    }
  ]
}

Rules:
- Include ALL spoken words with accurate timestamps
- Timestamps are in seconds with decimal precision
- confidence is 0.0 to 1.0
- Identify natural sentence/paragraph breaks as separate segments
- Do NOT include timestamps for silence (just skip those regions)
- Return ONLY the JSON object, no markdown, no explanation`;

  jobQueue.update(jobId, { progress: 40, message: 'Transcribing with AI…' });

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: audioBase64 } },
  ]);

  const responseText = result.response.text();
  jobQueue.update(jobId, { progress: 70, message: 'Processing transcript…' });

  // Parse JSON response
  let parsed: { language: string; duration: number; fullText: string; segments: TranscriptionResult['segments'] };
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch {
    throw new Error('Failed to parse transcription response from Gemini');
  }

  // Detect filler words across all word timestamps
  const allWords = parsed.segments.flatMap(s => s.words ?? []);
  const wordsWithFillers = detectFillerWords(allWords);
  const fillerWords = wordsWithFillers.filter(w => w.isFiller);

  // Detect silence regions (gaps between segments > 0.5s)
  const silenceRegions: Array<{ start: number; end: number; duration: number }> = [];
  for (let i = 1; i < parsed.segments.length; i++) {
    const gap = parsed.segments[i].start - parsed.segments[i - 1].end;
    if (gap >= 0.5) {
      silenceRegions.push({
        start: parsed.segments[i - 1].end,
        end: parsed.segments[i].start,
        duration: gap,
      });
    }
  }

  // Clean up extracted audio file
  if (audioPath !== videoPath) {
    try { fs.unlinkSync(audioPath); } catch { /* ignore */ }
  }

  jobQueue.update(jobId, { progress: 100, status: 'complete', message: `Transcribed ${parsed.segments.length} segments, found ${silenceRegions.length} silence regions, ${fillerWords.length} filler words` });

  return {
    fullText: parsed.fullText,
    segments: parsed.segments,
    language: parsed.language,
    duration: parsed.duration,
    silenceRegions,
    fillerWords,
  };
}
