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
  AllKeysExhaustedError as GroqAllKeysExhaustedError,
  type GroqMessage,
  type KeyState as GroqKeyState,
  type ProviderHealthReport as GroqProviderHealthReport,
  type RequestLog as GroqRequestLog,
  type StructuredError as GroqStructuredError,
} from "./groq";

export const providerManager = groqProviderManager;
export const AllKeysExhaustedError = GroqAllKeysExhaustedError;

export type KeyState = GroqKeyState;
export type ProviderHealthReport = GroqProviderHealthReport;
export type RequestLog = GroqRequestLog;
export type StructuredError = GroqStructuredError;
export type GeminiMessage = GroqMessage;

// ─── Direct Groq Convenience Wrappers ───

/**
 * Streaming chat response using Groq API keys
 */
export async function streamGeminiResponse(
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string
) {
  try {
    return await groqProviderManager.streamResponse(systemPrompt, history, userMessage);
  } catch (groqErr) {
    console.warn("[AI Provider Bridge] Groq stream failed, attempting Gemini fallback...", groqErr);
    // Fallback to Gemini if Groq keys are exhausted
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const geminiKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
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
 * Text generation using Groq API keys (e.g. for /api/analytics/ask-ai and metadata generation)
 */
export async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
    return await groqProviderManager.generateContent(systemPrompt, userMessage);
  } catch (groqErr) {
    console.warn("[AI Provider Bridge] Groq text generation failed, attempting Gemini fallback...", groqErr);
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const geminiKey = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY;
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
 * Visual frame analysis with images (multimodal)
 */
export async function callGeminiWithImages(
  systemPrompt: string,
  userMessage: string,
  images: { base64: string; mimeType: string }[]
): Promise<string> {
  return groqProviderManager.generateContentWithImages(systemPrompt, userMessage, images);
}
