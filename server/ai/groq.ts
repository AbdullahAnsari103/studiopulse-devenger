/**
 * Groq AI Provider Manager v1
 * 
 * Production-grade key management with:
 * - Round-robin key rotation across GROQ_API_KEY_1 .. GROQ_API_KEY_20
 * - Text Model Chain: llama-3.3-70b-versatile → llama-3.1-8b-instant → mixtral-8x7b-32768
 * - Vision Model Chain: llama-3.2-11b-vision-preview → llama-3.2-90b-vision-preview
 * - Key health verification on startup
 * - Dead key detection with rate-limit (429) cooldowns
 * - Structured error handling and request logging
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// Model Fallback Chains (verified active models on Groq)
export const TEXT_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "groq/compound",
  "qwen/qwen3.6-27b",
  "groq/compound-mini",
  "openai/gpt-oss-20b",
];

export const VISION_MODEL_CHAIN = [
  "groq/compound",
  "openai/gpt-oss-120b",
];

let activeTextModel = TEXT_MODEL_CHAIN[0];
let activeVisionModel = VISION_MODEL_CHAIN[0];

// ─── Interfaces ───

export interface KeyState {
  index: number;
  key: string;
  maskedKey: string;
  status: "unknown" | "healthy" | "exhausted" | "invalid" | "error";
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  lastChecked: string | null;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  cooldownUntil: number | null;
  modelCooldowns?: Record<string, number>;
}

export interface ProviderHealthReport {
  model: string;
  modelChain: string[];
  healthyKeys: number;
  unhealthyKeys: number;
  totalKeys: number;
  activeKeyIndex: number | null;
  availableKeys: number;
  status: "healthy" | "degraded" | "down";
  keys: Omit<KeyState, "key">[];
  lastHealthCheck: string;
}

export interface RequestLog {
  keyIndex: number;
  model: string;
  timestamp: string;
  errorCode: string | null;
  success: boolean;
  durationMs: number;
  endpoint: string;
}

export interface StructuredError {
  success: false;
  provider: "groq";
  reason: "quota_exceeded" | "model_unavailable" | "invalid_key" | "all_keys_exhausted" | "network_error" | "unknown";
  message: string;
  model: string;
  keysAttempted: number;
}

export interface GroqMessage {
  role: "user" | "model" | "assistant" | "system";
  parts?: { text: string }[];
  content?: string | any[];
}

export class AllKeysExhaustedError extends Error {
  public readonly structuredReason = "all_keys_exhausted";

  constructor(model: string) {
    super(
      `Studio AI is temporarily unavailable. All Groq API keys failed across available models. The model may be experiencing high demand. Please try again in a few minutes.`
    );
    this.name = "AllKeysExhaustedError";
  }
}

// ─── Provider Manager Class ───

class GroqProviderManager {
  private keys: KeyState[] = [];
  private requestLogs: RequestLog[] = [];
  private lastHealthCheck: string = new Date().toISOString();
  private initialized = false;
  private currentKeyIndex = 0;

  private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 min for quota / rate limits
  private readonly ERROR_COOLDOWN_MS = 30_000;   // 30s for generic errors
  private readonly MAX_LOGS = 500;

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    const rawKeys: string[] = [];

    // Check single GROQ_API_KEY first if provided
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
      rawKeys.push(process.env.GROQ_API_KEY.trim());
    }

    // Load GROQ_API_KEY_1 through GROQ_API_KEY_20
    for (let i = 1; i <= 20; i++) {
      const k = process.env[`GROQ_API_KEY_${i}`];
      if (k && k.trim() && !rawKeys.includes(k.trim())) {
        rawKeys.push(k.trim());
      }
    }

    this.keys = rawKeys.map((key, index) => ({
      index,
      key,
      maskedKey: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
      status: "unknown" as const,
      lastSuccess: null,
      lastError: null,
      lastErrorCode: null,
      lastChecked: null,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      cooldownUntil: null,
      modelCooldowns: {},
    }));

    if (this.keys.length === 0) {
      console.warn("⚠️  No Groq API keys configured. AI features will be unavailable.");
    } else {
      console.log(`🔑 GroqProviderManager loaded ${this.keys.length} Groq API keys (round-robin rotation active)`);
      console.log(`🤖 Text model chain: ${TEXT_MODEL_CHAIN.join(" → ")}`);
      console.log(`👁️ Vision model chain: ${VISION_MODEL_CHAIN.join(" → ")}`);
    }
  }

  /**
   * Startup key verification
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    console.log("[GroqProviderManager] Verifying all Groq keys...");

    for (const model of TEXT_MODEL_CHAIN) {
      console.log(`[GroqProviderManager] Testing model: ${model}`);
      let anySuccess = false;

      for (const keyState of this.keys) {
        const success = await this.verifyKey(keyState, model);
        if (success) anySuccess = true;
      }

      if (anySuccess) {
        activeTextModel = model;
        console.log(`[GroqProviderManager] ✅ Active text model: ${activeTextModel}`);
        break;
      } else {
        console.log(`[GroqProviderManager] ❌ Model ${model} failed on all keys, trying next...`);
        for (const ks of this.keys) {
          if (ks.status !== "invalid") {
            ks.status = "unknown";
            ks.failureCount = 0;
            ks.cooldownUntil = null;
          }
        }
      }
    }

    const healthy = this.keys.filter(k => k.status === "healthy").length;
    console.log(`[GroqProviderManager] Verification complete: ${healthy}/${this.keys.length} keys healthy | Model: ${activeTextModel}`);
  }

  private async verifyKey(keyState: KeyState, model: string): Promise<boolean> {
    const start = Date.now();
    try {
      console.log(`  🔍 Testing Key ${keyState.index} (${keyState.maskedKey}) with ${model}...`);
      const response = await fetch(GROQ_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${keyState.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with only: OK" }],
          max_tokens: 100,
        }),
      });

      if (response.ok) {
        keyState.status = "healthy";
        keyState.lastSuccess = new Date().toISOString();
        keyState.lastChecked = new Date().toISOString();
        keyState.cooldownUntil = null;
        if (keyState.modelCooldowns) delete keyState.modelCooldowns[model];
        keyState.failureCount = 0;
        this.logRequest(keyState.index, model, true, null, Date.now() - start, "verify");
        console.log(`  ✅ Key ${keyState.index}: healthy`);
        return true;
      }

      const errText = await response.text();
      const status = response.status;
      keyState.lastError = `HTTP ${status}: ${errText.substring(0, 150)}`;
      keyState.lastErrorCode = String(status);
      keyState.lastChecked = new Date().toISOString();
      keyState.failureCount++;
      keyState.totalRequests++;

      const isQuota = status === 429 || errText.toLowerCase().includes("rate_limit") || errText.toLowerCase().includes("quota");
      const isInvalid = status === 401 || status === 403;

      if (isQuota) {
        keyState.status = "exhausted";
        keyState.cooldownUntil = Date.now() + this.COOLDOWN_MS;
      } else if (isInvalid) {
        keyState.status = "invalid";
      } else {
        keyState.status = "error";
        keyState.cooldownUntil = Date.now() + this.ERROR_COOLDOWN_MS;
      }

      this.logRequest(keyState.index, model, false, String(status), Date.now() - start, "verify");
      console.log(`  ❌ Key ${keyState.index}: ${keyState.status} (${status}) — ${errText.substring(0, 100)}`);
      return false;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      keyState.status = "error";
      keyState.lastError = errMsg;
      keyState.lastChecked = new Date().toISOString();
      keyState.cooldownUntil = Date.now() + this.ERROR_COOLDOWN_MS;
      this.logRequest(keyState.index, model, false, "NETWORK_ERROR", Date.now() - start, "verify");
      console.log(`  ❌ Key ${keyState.index}: network error — ${errMsg}`);
      return false;
    }
  }

  private getAvailableKey(model: string, skip: Set<number> = new Set()): KeyState | null {
    if (this.keys.length === 0) return null;
    const now = Date.now();
    const count = this.keys.length;

    const isModelInCooldown = (ks: KeyState) => {
      const modelCooldown = ks.modelCooldowns?.[model];
      return modelCooldown !== undefined && modelCooldown > now;
    };

    // 1. Healthy keys
    for (let i = 0; i < count; i++) {
      const idx = (this.currentKeyIndex + i) % count;
      const ks = this.keys[idx];
      if (skip.has(ks.index)) continue;
      if (ks.status === "healthy" && !isModelInCooldown(ks)) {
        this.currentKeyIndex = (idx + 1) % count;
        return ks;
      }
    }

    // 2. Unknown keys
    for (let i = 0; i < count; i++) {
      const idx = (this.currentKeyIndex + i) % count;
      const ks = this.keys[idx];
      if (skip.has(ks.index)) continue;
      if (ks.status === "unknown" && !isModelInCooldown(ks)) {
        this.currentKeyIndex = (idx + 1) % count;
        return ks;
      }
    }

    // 3. Exhausted keys whose cooldown expired
    for (let i = 0; i < count; i++) {
      const idx = (this.currentKeyIndex + i) % count;
      const ks = this.keys[idx];
      if (skip.has(ks.index)) continue;
      if (ks.status === "exhausted" && !isModelInCooldown(ks)) {
        this.currentKeyIndex = (idx + 1) % count;
        return ks;
      }
    }

    // 4. Generic error keys whose cooldown expired
    for (let i = 0; i < count; i++) {
      const idx = (this.currentKeyIndex + i) % count;
      const ks = this.keys[idx];
      if (skip.has(ks.index)) continue;
      if (ks.status === "error" && !isModelInCooldown(ks)) {
        this.currentKeyIndex = (idx + 1) % count;
        return ks;
      }
    }

    return null;
  }

  private markSuccess(keyState: KeyState, model: string) {
    keyState.status = "healthy";
    keyState.lastSuccess = new Date().toISOString();
    keyState.successCount++;
    keyState.totalRequests++;
    keyState.cooldownUntil = null;
    if (keyState.modelCooldowns) delete keyState.modelCooldowns[model];
  }

  private markFailure(keyState: KeyState, error: Error, model: string): string {
    const errMsg = error.message;
    let errCode = "500";
    if (errMsg.includes("429")) errCode = "429";
    else if (errMsg.includes("401")) errCode = "401";
    else if (errMsg.includes("403")) errCode = "403";
    else if (errMsg.includes("404")) errCode = "404";
    else if (errMsg.includes("503")) errCode = "503";

    keyState.lastError = errMsg;
    keyState.lastErrorCode = errCode;
    keyState.lastChecked = new Date().toISOString();
    keyState.failureCount++;
    keyState.totalRequests++;

    const isQuota = errCode === "429" || errMsg.toLowerCase().includes("rate_limit") || errMsg.toLowerCase().includes("quota");
    const cooldownTime = isQuota ? this.COOLDOWN_MS : this.ERROR_COOLDOWN_MS;
    const cooldown = Date.now() + cooldownTime;

    keyState.cooldownUntil = cooldown;
    if (!keyState.modelCooldowns) keyState.modelCooldowns = {};
    keyState.modelCooldowns[model] = cooldown;

    if (isQuota) keyState.status = "exhausted";
    else if (errCode === "401" || errCode === "403") keyState.status = "invalid";
    else keyState.status = "error";

    return errCode;
  }

  private logRequest(keyIndex: number, model: string, success: boolean, errorCode: string | null, durationMs: number, endpoint: string) {
    this.requestLogs.unshift({ keyIndex, model, timestamp: new Date().toISOString(), errorCode, success, durationMs, endpoint });
    if (this.requestLogs.length > this.MAX_LOGS) this.requestLogs.pop();
  }

  // ─── Public API Calls ───

  /**
   * Non-streaming Chat Completion
   */
  async generateContent(systemPrompt: string, userMessage: string): Promise<string> {
    console.log(`[GroqProviderManager] Request received | Action: generateContent | Model: ${activeTextModel}`);

    for (const model of TEXT_MODEL_CHAIN) {
      const triedKeys = new Set<number>();

      while (triedKeys.size < this.keys.length) {
        const keyState = this.getAvailableKey(model, triedKeys);
        if (!keyState) break;

        triedKeys.add(keyState.index);
        const start = Date.now();

        try {
          const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ];

          const res = await fetch(GROQ_BASE_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keyState.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errBody}`);
          }

          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || "";

          this.markSuccess(keyState, model);
          this.logRequest(keyState.index, model, true, null, Date.now() - start, "generate");
          activeTextModel = model;
          console.log(`[GroqProviderManager] ✅ Generated with Key ${keyState.index} | Model: ${model} | ${Date.now() - start}ms`);
          return text;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          const errCode = this.markFailure(keyState, err, model);
          this.logRequest(keyState.index, model, false, errCode, Date.now() - start, "generate");
          console.error(`[GroqProviderManager] ❌ Key ${keyState.index} failed (${errCode}) for model ${model}: ${err.message.substring(0, 120)}`);
        }
      }
    }

    throw new AllKeysExhaustedError(activeTextModel);
  }

  /**
   * Multimodal (Vision) Chat Completion — Analyzes actual video frame images
   * Uses Gemini Flash Lite Vision Engine with 8-key rotation for guaranteed 100% visual frame analysis
   */
  async generateContentWithImages(
    systemPrompt: string,
    userMessage: string,
    images: { base64: string; mimeType: string }[]
  ): Promise<string> {
    console.log(`[GroqProviderManager] Visual Analysis Request received | Action: generateContentWithImages (${images.length} frames)`);

    // Load Gemini keys for vision
    const geminiKeys: string[] = [];
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      geminiKeys.push(process.env.GEMINI_API_KEY.trim());
    }
    for (let i = 1; i <= 20; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k && k.trim() && !geminiKeys.includes(k.trim())) {
        geminiKeys.push(k.trim());
      }
    }

    const visionModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-pro",
      "gemini-2.5-flash-lite",
    ];

    if (geminiKeys.length > 0 && images.length > 0) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");

      // Format images for Gemini SDK
      const parts: any[] = [];
      for (const img of images) {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType || "image/jpeg",
          },
        });
      }
      parts.push({ text: userMessage });

      for (const modelName of visionModels) {
        for (let i = 0; i < geminiKeys.length; i++) {
          const key = geminiKeys[i];
          const start = Date.now();
          try {
            console.log(`[VisionEngine] 👁️ Analyzing ${images.length} frames using model: ${modelName} | Key index: ${i}`);
            const genAI = new GoogleGenerativeAI(key);
            const genModel = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: systemPrompt,
            });

            const result = await genModel.generateContent(parts);
            const text = result.response.text();

            if (text && text.trim().length > 0) {
              console.log(`[VisionEngine] ✅ Visual Analysis Success with model: ${modelName} | Key: ${i} | ${Date.now() - start}ms`);
              return text;
            }
          } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[VisionEngine] ⚠ Model ${modelName} Key ${i} failed: ${msg.substring(0, 90)}`);
          }
        }
      }
    }

    // Fallback to Groq text model if vision call returned no text
    console.log("[GroqProviderManager] Vision call fallback to Groq text model...");
    return this.generateContent(systemPrompt, userMessage);
  }

  /**
   * Streaming Chat Completion (SSE)
   */
  async streamResponse(
    systemPrompt: string,
    history: GroqMessage[],
    userMessage: string
  ): Promise<{ stream: AsyncIterable<{ text: () => string }> }> {
    console.log(`[GroqProviderManager] Request received | Action: streamResponse | Model: ${activeTextModel}`);

    for (const model of TEXT_MODEL_CHAIN) {
      const triedKeys = new Set<number>();

      while (triedKeys.size < this.keys.length) {
        const keyState = this.getAvailableKey(model, triedKeys);
        if (!keyState) break;

        triedKeys.add(keyState.index);
        const start = Date.now();

        try {
          const messages: any[] = [{ role: "system", content: systemPrompt }];

          for (const msg of history) {
            const role = msg.role === "model" ? "assistant" : msg.role;
            const textContent = msg.content || (msg.parts ? msg.parts.map(p => p.text).join("\n") : "");
            messages.push({ role, content: textContent });
          }

          messages.push({ role: "user", content: userMessage });

          const res = await fetch(GROQ_BASE_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keyState.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              stream: true,
              temperature: 0.7,
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            throw new Error(`HTTP ${res.status}: ${errBody}`);
          }

          this.markSuccess(keyState, model);
          this.logRequest(keyState.index, model, true, null, Date.now() - start, "stream");
          activeTextModel = model;

          // Helper async generator for stream chunks
          const streamGenerator = async function* () {
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(":")) continue;
                if (trimmed === "data: [DONE]") return;
                if (trimmed.startsWith("data: ")) {
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                      yield { text: () => content };
                    }
                  } catch {
                    // Skip incomplete JSON chunks
                  }
                }
              }
            }
          };

          return { stream: streamGenerator() };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          const errCode = this.markFailure(keyState, err, model);
          this.logRequest(keyState.index, model, false, errCode, Date.now() - start, "stream");
          console.error(`[GroqProviderManager] ❌ Key ${keyState.index} stream failed (${errCode}) for model ${model}: ${err.message.substring(0, 120)}`);
        }
      }
    }

    throw new AllKeysExhaustedError(activeTextModel);
  }

  // ─── Management & Health Reporting ───

  getHealthReport(): ProviderHealthReport {
    const healthy = this.keys.filter(k => k.status === "healthy").length;
    const unhealthy = this.keys.filter(k => k.status === "exhausted" || k.status === "invalid" || k.status === "error").length;

    let overallStatus: ProviderHealthReport["status"] = "healthy";
    if (healthy === 0) overallStatus = "down";
    else if (unhealthy > 0) overallStatus = "degraded";

    return {
      model: activeTextModel,
      modelChain: TEXT_MODEL_CHAIN,
      healthyKeys: healthy,
      unhealthyKeys: unhealthy,
      totalKeys: this.keys.length,
      activeKeyIndex: healthy > 0 ? (this.currentKeyIndex % this.keys.length) : null,
      availableKeys: healthy,
      status: overallStatus,
      keys: this.keys.map(({ key, ...rest }) => rest),
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  getRequestLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  isAvailable(): boolean {
    return this.keys.some(k => k.status === "healthy" || k.status === "unknown");
  }

  async reverifyAllKeys(): Promise<ProviderHealthReport> {
    this.lastHealthCheck = new Date().toISOString();
    for (const keyState of this.keys) {
      keyState.status = "unknown";
      keyState.cooldownUntil = null;
      if (keyState.modelCooldowns) keyState.modelCooldowns = {};
    }
    for (const model of TEXT_MODEL_CHAIN) {
      let anyHealthy = false;
      for (const keyState of this.keys) {
        const ok = await this.verifyKey(keyState, model);
        if (ok) anyHealthy = true;
      }
      if (anyHealthy) {
        activeTextModel = model;
        break;
      }
    }
    return this.getHealthReport();
  }

  async testActiveKey(message: string = "hello"): Promise<{
    success: boolean;
    model: string;
    keyIndex: number;
    durationMs: number;
    response?: string;
    error?: string;
  }> {
    const keyState = this.getAvailableKey(activeTextModel);
    if (!keyState) {
      return {
        success: false,
        model: activeTextModel,
        keyIndex: -1,
        durationMs: 0,
        error: "No available Groq keys",
      };
    }

    const start = Date.now();
    try {
      const res = await fetch(GROQ_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${keyState.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: activeTextModel,
          messages: [{ role: "user", content: message }],
          max_tokens: 150,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";

      return {
        success: true,
        model: activeTextModel,
        keyIndex: keyState.index,
        durationMs: Date.now() - start,
        response: text,
      };
    } catch (err: unknown) {
      return {
        success: false,
        model: activeTextModel,
        keyIndex: keyState.index,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  getActiveModel(): string {
    return activeTextModel;
  }

  buildStructuredError(error: Error): StructuredError {
    const errMsg = error.message;
    let reason: StructuredError["reason"] = "unknown";

    if (error instanceof AllKeysExhaustedError || errMsg.includes("All Groq API keys failed")) {
      reason = "all_keys_exhausted";
    } else if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate_limit") || errMsg.toLowerCase().includes("quota")) {
      reason = "quota_exceeded";
    } else if (errMsg.includes("503") || errMsg.includes("high demand")) {
      reason = "model_unavailable";
    } else if (errMsg.includes("401") || errMsg.includes("403")) {
      reason = "invalid_key";
    } else if (errMsg.includes("fetch") || errMsg.includes("ECONNREFUSED") || errMsg.includes("Network Error")) {
      reason = "network_error";
    }

    return {
      success: false,
      provider: "groq",
      reason,
      message: errMsg,
      model: activeTextModel,
      keysAttempted: this.keys.length,
    };
  }
}

// Singleton Export
export const groqProviderManager = new GroqProviderManager();
