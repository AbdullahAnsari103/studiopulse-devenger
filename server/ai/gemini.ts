/**
 * AI Provider Bridge — Primary: Groq Multi-Key Engine with Gemini Fallback
 * 
 * Configured to use Groq API keys as the primary AI engine for text & streaming:
 * - Primary Engine: Groq API with 8-Key Round-Robin Rotation (openai/gpt-oss-120b, groq/compound, qwen/qwen3.6-27b)
 * - Secondary Fallback: Google Gemini API (gemini-2.5-flash) if Groq is rate-limited
 * - Multimodal Engine: Gemini 2.5 Flash Vision for video frame & image analysis
 */

import {
  groqProviderManager,
  groqChatProviderManager,
  groqTaskProviderManager,
  AllKeysExhaustedError as GroqAllKeysExhaustedError,
  type GroqMessage,
  type KeyState as GroqKeyState,
  type ProviderHealthReport as GroqProviderHealthReport,
  type RequestLog as GroqRequestLog,
  type StructuredError as GroqStructuredError,
} from "./groq";

export const providerManager = groqChatProviderManager;
export const chatProviderManager = groqChatProviderManager;
export const taskProviderManager = groqTaskProviderManager;
export const AllKeysExhaustedError = GroqAllKeysExhaustedError;

export type KeyState = GroqKeyState;
export type ProviderHealthReport = GroqProviderHealthReport;
export type RequestLog = GroqRequestLog;
export type StructuredError = GroqStructuredError;
export type GeminiMessage = GroqMessage;

// ─── Direct Groq Convenience Wrappers ───

/**
 * Streaming chat response using dedicated 8 Groq Chat API keys
 */
export async function streamGeminiResponse(
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string
) {
  try {
    return await groqChatProviderManager.streamResponse(systemPrompt, history, userMessage);
  } catch (groqErr) {
    console.warn("[AI Provider Bridge] Groq chat stream failed, attempting Gemini fallback...", groqErr);
    // Fallback to Gemini if Groq chat keys are exhausted
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      
      const geminiKeys: string[] = [];
      for (let i = 1; i <= 30; i++) {
        if (process.env[`GEMINI_BACKUP_KEY_${i}`]) geminiKeys.push(process.env[`GEMINI_BACKUP_KEY_${i}`] as string);
      }
      
      const geminiKey = geminiKeys.length > 0 ? geminiKeys[Math.floor(Math.random() * geminiKeys.length)] : null;

      if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemPrompt || undefined,
        });

        const formattedHistory = (history || []).map((msg) => ({
          role: msg.role === "model" || msg.role === "assistant" ? "model" : "user",
          parts: msg.parts || [{ text: typeof msg.content === "string" ? msg.content : "" }],
        }));

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessageStream(userMessage);

        return {
          stream: (async function* () {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              yield { text: () => chunkText };
            }
          })(),
        };
      }
    } catch (geminiErr) {
      console.error("[AI Provider Bridge] Gemini fallback also failed:", geminiErr);
    }
    throw groqErr;
  }
}

/**
 * Text generation for background AI tasks (e.g. for /api/analytics/ask-ai, autopilot, metadata generation)
 * Uses dedicated 8 Groq Task API keys
 */
export async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    return await groqTaskProviderManager.generateContent(systemPrompt, userMessage);
  } catch (groqErr) {
    console.warn("[AI Provider Bridge] Groq task generation failed, attempting Gemini fallback...", groqErr);
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      
      const geminiKeys: string[] = [];
      for (let i = 1; i <= 30; i++) {
        if (process.env[`GEMINI_BACKUP_KEY_${i}`]) geminiKeys.push(process.env[`GEMINI_BACKUP_KEY_${i}`] as string);
      }
      
      const geminiKey = geminiKeys.length > 0 ? geminiKeys[Math.floor(Math.random() * geminiKeys.length)] : null;

      if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemPrompt || undefined,
        });
        const result = await model.generateContent(userMessage);
        const text = result.response.text();
        if (text) return text;
      }
    } catch (geminiErr) {
      console.error("[AI Provider Bridge] Gemini fallback also failed:", geminiErr);
    }
    throw groqErr;
  }
}

/**
 * Direct chat text generation using dedicated 8 Groq Chat API keys
 */
export async function callChatGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    return await groqChatProviderManager.generateContent(systemPrompt, userMessage);
  } catch (groqErr) {
    return callGemini(systemPrompt, userMessage);
  }
}

/**
/**
 * Visual frame analysis with images (multimodal) — Direct Gemini 2.5 Flash Vision
 * with 60+ Gemini Key Pool, Cooldown Tracking & Seamless Groq Engine Fallback.
 */
const geminiKeyCooldowns = new Map<string, number>();

function getAllGeminiKeys(): string[] {
  const keys: string[] = [];
  const add = (k?: string) => {
    if (k && k.trim() && !keys.includes(k.trim())) keys.push(k.trim());
  };

  // Active clip keys first (highest availability)
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_CLIP_KEY_${i}`]);
  // Primary vision keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_API_KEY_${i}`]);
  // Audio keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_AUDIO_KEY_${i}`]);
  // Backup keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_BACKUP_KEY_${i}`]);
  // Editor keys
  for (let i = 1; i <= 20; i++) add(process.env[`GEMINI_EDITOR_KEY_${i}`]);

  return keys;
}

let lastVisionKeyIdx = 0;

export async function callGeminiWithImages(
  systemPrompt: string,
  userMessage: string,
  images: { base64: string; mimeType: string; timeSeconds?: number; timestamp?: string }[]
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const allKeys = getAllGeminiKeys();
  if (allKeys.length === 0) {
    console.warn("[VisionEngine] No Gemini keys configured, using Studio AI Groq engine");
    const { groqProviderManager } = await import("./groq");
    return groqProviderManager.generateContent(systemPrompt, userMessage);
  }

  // Filter keys not currently in 429 cooldown
  const now = Date.now();
  const availableKeys = allKeys.filter((k) => (geminiKeyCooldowns.get(k) || 0) <= now);
  const candidateKeys = availableKeys.length > 0 ? availableKeys : allKeys; // reset if all in cooldown

  const maxAttempts = Math.min(candidateKeys.length, 10);
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const idx = (lastVisionKeyIdx + attempt) % candidateKeys.length;
    const apiKey = candidateKeys[idx];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt || undefined,
      });

      console.log(`[VisionEngine] Gemini 2.5 Flash vision request (key #${idx + 1}/${candidateKeys.length}, ${images.length} frames)`);
      const startMs = Date.now();

      // Build multimodal content: interleaved frame metadata + images + text prompt
      const parts: any[] = [];
      const frameList = images.slice(0, 12);
      for (let i = 0; i < frameList.length; i++) {
        const img = frameList[i];
        const sec = typeof img.timeSeconds === "number" ? img.timeSeconds : 0;
        const min = Math.floor(sec / 60);
        const remSec = sec % 60;
        const ts = img.timestamp || `${min}:${remSec < 10 ? "0" : ""}${remSec}`;

        parts.push({
          text: `\n[EXACT VIDEO TIMELINE - FRAME #${i + 1} AT TIMESTAMP ${ts} (${sec} SECONDS)]\nExamine the visual scene below captured at exactly ${ts} into the video (look for screen UI, presentation slides, titles, workflows, or scene transitions):`,
        });
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: img.base64,
          },
        });
      }
      parts.push({ text: `\n\n[USER REQUEST & OPTIMIZATION DIRECTIVES]\n${userMessage}` });

      const result = await model.generateContent(parts);
      const text = result.response.text();
      const elapsedMs = Date.now() - startMs;

      lastVisionKeyIdx = (idx + 1) % candidateKeys.length;
      console.log(`[VisionEngine] ✅ Gemini vision complete in ${elapsedMs}ms (key #${idx + 1}) | Response: ${text.slice(0, 80)}...`);

      if (text) return text;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[VisionEngine] Gemini vision attempt ${attempt + 1} (key #${idx + 1}) failed: ${errMsg.slice(0, 160)}`);

      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        // Mark this specific key in cooldown for 60 seconds
        geminiKeyCooldowns.set(apiKey, Date.now() + 60000);
        continue;
      }
    }
  }

  // If all Gemini keys hit quota limits (429), seamlessly fall back to Studio AI Groq text engine
  console.warn(`[VisionEngine] Gemini keys temporarily rate-limited (429), engaging Studio AI Groq fallback engine...`);
  try {
    const { groqProviderManager } = await import("./groq");
    return await groqProviderManager.generateContent(systemPrompt, userMessage);
  } catch (groqErr) {
    console.error(`[VisionEngine] Groq fallback also failed:`, groqErr);
    throw lastError || new Error("All AI vision and fallback engines exhausted");
  }
}
