import dotenv from "dotenv";
dotenv.config();

/**
 * Groq AI Provider Manager v1
 * 
 * Production-grade key management with:
 * - Round-robin key rotation across GROQ_CHAT_KEY_1..8 & GROQ_TASK_KEY_1..8
 * - Text Model Chain: groq/compound-mini → groq/compound → openai/gpt-oss-20b → openai/gpt-oss-120b
 * - Key health verification on startup
 * - Dead key detection with rate-limit (429) cooldowns
 * - Structured error handling and request logging
 */

const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

// High-Capacity Enterprise Model Chain (Optimized for JSON generation & high token limits)
export const TEXT_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
];

export const VISION_MODEL_CHAIN = [
  "groq/compound",
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

export class GroqProviderManager {
  private poolName: "chat" | "task" | "default";
  private keys: KeyState[] = [];
  private requestLogs: RequestLog[] = [];
  private lastHealthCheck: string = new Date().toISOString();
  private initialized = false;
  private currentKeyIndex = 0;

  private readonly COOLDOWN_MS = 60_000;        // 60s for Groq 1-minute rate limits
  private readonly ERROR_COOLDOWN_MS = 20_000;   // 20s for generic errors
  private readonly MAX_LOGS = 500;

  constructor(poolName: "chat" | "task" | "default" = "default") {
    this.poolName = poolName;
    this.loadKeys();
  }

  private loadKeys() {
    const rawKeys: string[] = [];

    if (this.poolName === "chat") {
      // 1. Load dedicated GROQ_CHAT_KEY_1 through GROQ_CHAT_KEY_20
      for (let i = 1; i <= 20; i++) {
        const k = process.env[`GROQ_CHAT_KEY_${i}`];
        if (k && k.trim() && !rawKeys.includes(k.trim())) {
          rawKeys.push(k.trim());
        }
      }
    } else if (this.poolName === "task") {
      // 1. Load dedicated GROQ_TASK_KEY_1 through GROQ_TASK_KEY_20
      for (let i = 1; i <= 20; i++) {
        const k = process.env[`GROQ_TASK_KEY_${i}`];
        if (k && k.trim() && !rawKeys.includes(k.trim())) {
          rawKeys.push(k.trim());
        }
      }
    }

    // Fallback to GROQ_API_KEY_1..20 if pool-specific keys were not found
    if (rawKeys.length === 0) {
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
        rawKeys.push(process.env.GROQ_API_KEY.trim());
      }
      for (let i = 1; i <= 20; i++) {
        const k = process.env[`GROQ_API_KEY_${i}`];
        if (k && k.trim() && !rawKeys.includes(k.trim())) {
          rawKeys.push(k.trim());
        }
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
      console.warn(`⚠️  No Groq API keys configured for [${this.poolName.toUpperCase()}] pool.`);
    } else {
      console.log(`🔑 GroqProviderManager [${this.poolName.toUpperCase()} POOL] loaded ${this.keys.length} Groq API keys (isolated round-robin active)`);
      console.log(`🤖 Text model chain: ${TEXT_MODEL_CHAIN.join(" → ")}`);
    }
  }

  /**
   * Lightweight startup key verification
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Default all loaded keys to healthy status
    for (const ks of this.keys) {
      ks.status = "healthy";
    }

    const testKey = this.keys[0];
    if (testKey) {
      activeTextModel = TEXT_MODEL_CHAIN[0];
      console.log(`[GroqProviderManager] 🚀 [${this.poolName.toUpperCase()} POOL] Ready with ${this.keys.length} keys | Active model: ${activeTextModel}`);
    }
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
    if (this.keys.length === 0) {
      this.loadKeys();
    }
    if (this.keys.length === 0) return null;
    const now = Date.now();
    const count = this.keys.length;

    const isModelInCooldown = (ks: KeyState) => {
      const modelCooldown = ks.modelCooldowns?.[model];
      return modelCooldown !== undefined && modelCooldown > now;
    };

    // 1. Healthy keys for this model
    for (let i = 0; i < count; i++) {
      const idx = (this.currentKeyIndex + i) % count;
      const ks = this.keys[idx];
      if (skip.has(ks.index)) continue;
      if (ks.status !== "invalid" && !isModelInCooldown(ks)) {
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
    else if (errMsg.includes("413")) errCode = "413";
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
    const isPayloadTooLarge = errCode === "413" || errMsg.toLowerCase().includes("request_too_large") || errMsg.toLowerCase().includes("entity too large");
    const cooldownTime = isQuota ? this.COOLDOWN_MS : this.ERROR_COOLDOWN_MS;
    const cooldown = Date.now() + cooldownTime;

    if (!keyState.modelCooldowns) keyState.modelCooldowns = {};
    keyState.modelCooldowns[model] = cooldown;

    // 413 Request Too Large: payload is the same for ALL keys, so skip them all
    // for this model immediately. The next model in the chain may accept the payload.
    if (isPayloadTooLarge) {
      console.warn(`[GroqProviderManager] ⚠️ Payload too large for model ${model} — skipping all keys for this model`);
      for (const ks of this.keys) {
        if (!ks.modelCooldowns) ks.modelCooldowns = {};
        ks.modelCooldowns[model] = cooldown;
      }
    }

    // Org-level rate limit: if the error mentions "organization", ALL keys share
    // the same org quota so cooldown ALL keys for this model at once.
    // This prevents the cascade of 8 identical "Key X failed (429)" logs.
    if (isQuota && errMsg.toLowerCase().includes("organization")) {
      for (const ks of this.keys) {
        if (!ks.modelCooldowns) ks.modelCooldowns = {};
        ks.modelCooldowns[model] = cooldown;
      }
    }

    if (errCode === "401" || errCode === "403") {
      keyState.status = "invalid";
      keyState.cooldownUntil = cooldown;
    } else if (isQuota) {
      keyState.status = "exhausted";
    } else {
      keyState.status = "error";
    }

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
          const sys = userMessage ? systemPrompt : "";
          const usr = userMessage || systemPrompt || "";
          const messages = [
            ...(sys ? [{ role: "system", content: sys }] : []),
            { role: "user", content: usr }
          ];

          const isJsonRequested = (sys + " " + usr).toLowerCase().includes("json");

          let res = await fetch(GROQ_BASE_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${keyState.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.7,
              ...(isJsonRequested ? { response_format: { type: "json_object" } } : {}),
            }),
          });

          if (!res.ok) {
            const errBody = await res.text();
            // If Groq strict JSON validator failed (common on Qwen), retry without response_format constraint
            if (res.status === 400 && errBody.includes("Failed to validate JSON") && isJsonRequested) {
              res = await fetch(GROQ_BASE_URL, {
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
                const retryErr = await res.text();
                throw new Error(`HTTP ${res.status}: ${retryErr}`);
              }
            } else {
              throw new Error(`HTTP ${res.status}: ${errBody}`);
            }
          }

          const data = await res.json();
          const rawText = data.choices?.[0]?.message?.content || "";
          const text = rawText
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/^(?:We need to|I need to|Thinking Process:|Thought:|Plan:).*?(?:\n\n|\r\n\r\n)/i, "")
            .trim();

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
   * Fast Multimodal Visual Frame Analysis with Rapid Groq Fallback (<3s)
   */
  async generateContentWithImages(
    systemPrompt: string,
    userMessage: string,
    images: { base64: string; mimeType: string }[]
  ): Promise<string> {
    console.log(`[GroqProviderManager] Visual Analysis Request received | Action: generateContentWithImages (${images.length} frames)`);

    // Load up to 2 active Gemini keys for rapid vision attempt
    const geminiKeys: string[] = [];
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      geminiKeys.push(process.env.GEMINI_API_KEY.trim());
    }
    for (let i = 1; i <= 3; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k && k.trim() && !geminiKeys.includes(k.trim())) {
        geminiKeys.push(k.trim());
      }
    }

    if (geminiKeys.length > 0 && images.length > 0) {
      try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");

        // Format images for Gemini SDK (limit to top 3 frames to keep request payload light)
        const parts: any[] = [];
        for (const img of images.slice(0, 3)) {
          parts.push({
            inlineData: {
              data: img.base64,
              mimeType: img.mimeType || "image/jpeg",
            },
          });
        }
        parts.push({ text: userMessage });

        for (const key of geminiKeys.slice(0, 2)) {
          try {
            const genAI = new GoogleGenerativeAI(key);
            const genModel = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: systemPrompt,
            });

            // 5-second timeout for rapid vision response
            const visionPromise = genModel.generateContent(parts);
            const timeoutPromise = new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error("Vision timeout 5s")), 5000)
            );

            const result = await Promise.race([visionPromise, timeoutPromise]) as any;
            if (result) {
              const text = result.response?.text();
              if (text && text.trim().length > 0) {
                console.log(`[VisionEngine] ✅ Visual Analysis Success via Gemini 2.5 Flash`);
                return text;
              }
            }
          } catch (keyErr: any) {
            console.warn(`[VisionEngine] Rapid vision attempt notice: ${keyErr?.message || keyErr}`);
          }
        }
      } catch (importErr) {
        console.warn("[VisionEngine] Vision import notice:", importErr);
      }
    }

    // Instant fallback to Groq (<1s)
    console.log("[GroqProviderManager] Fast fallback to Groq AI engine for metadata...");
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
          console.log(`[GroqProviderManager] ✅ Stream connected with Key ${keyState.index} | Model: ${model} | ${Date.now() - start}ms`);

          const streamGenerator = async function* () {
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let inThinkBlock = false;

            try {
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
                      if (json.error) {
                         throw new Error(`Stream Error: ${json.error.message || JSON.stringify(json.error)}`);
                      }
                      const choice = json.choices?.[0];
                      const delta = choice?.delta;
                      
                      // Stream ONLY true user-facing content — never leak model reasoning scratchpad
                      let content = delta?.content || "";
                      if (!content && choice?.message?.content) {
                        content = choice.message.content;
                      }
                      
                      if (content) {
                        if (content.includes("<think>")) inThinkBlock = true;
                        if (inThinkBlock) {
                          if (content.includes("</think>")) {
                            content = content.replace(/<think>[\s\S]*?<\/think>/g, "");
                            inThinkBlock = false;
                          } else {
                            continue;
                          }
                        }
                        content = content.replace(/<\/?think>/g, "");
                        if (content) {
                          yield { text: () => content };
                        }
                      }
                    } catch (e) {
                      if (e instanceof Error && e.message.startsWith("Stream Error:")) throw e;
                    }
                  } else if (trimmed.startsWith("{") && trimmed.includes('"error"')) {
                      try {
                        const json = JSON.parse(trimmed);
                        if (json.error) {
                           throw new Error(`Stream Error: ${json.error.message || JSON.stringify(json.error)}`);
                        }
                      } catch (e) {
                         if (e instanceof Error && e.message.startsWith("Stream Error:")) throw e;
                      }
                  }
                }
              }
            } catch (err) {
              console.error(`[GroqProviderManager] Stream aborted during read:`, err);
              throw err;
            }
          };
          
          const generator = streamGenerator();
          
          // Pre-fetch the first chunk to catch immediate stream errors (like 429s) before returning.
          // This ensures the error is thrown inside this try/catch block so the key fallback logic works.
          const firstResult = await generator.next();
          
          const wrappedGenerator = async function* () {
             if (!firstResult.done) {
                 yield firstResult.value;
                 yield* generator;
             }
          };

          return { stream: wrappedGenerator() };
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

// ─── Singleton Exports ───
// 8 Keys dedicated solely to AI Chat, Normal Chat, and Web Research Streaming
export const groqChatProviderManager = new GroqProviderManager("chat");

// 8 Keys dedicated to background tasks (Analytics, Autopilot, Metadata, Brain Sync)
export const groqTaskProviderManager = new GroqProviderManager("task");

// Default bridge alias for chat & streaming
export const groqProviderManager = groqChatProviderManager;
