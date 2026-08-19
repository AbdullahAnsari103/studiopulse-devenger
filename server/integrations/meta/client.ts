/**
 * Generic Meta Graph API HTTP Client
 *
 * Single entry point for ALL HTTP communication with graph.facebook.com.
 * Handles API versioning, authorization headers, 10s timeouts, retries
 * on 5xx errors with exponential backoff, and structured Graph error parsing.
 *
 * Extension points:
 *   // Phase 2: Page Insights & Media Analytics
 *   // Phase 3: Post, Reels & Stories Publishing
 *   // Phase 4: Webhooks & Live Notifications
 */

import { metaConfig } from "./config";
import type { MetaGraphErrorPayload } from "./types";

export class MetaClientError extends Error {
  public code: number;
  public subcode?: number;
  public type: string;

  constructor(message: string, code: number, type: string, subcode?: number) {
    super(message);
    this.name = "MetaClientError";
    this.code = code;
    this.type = type;
    this.subcode = subcode;
  }
}

class MetaClient {
  private timeoutMs = 10000;
  private maxRetries = 2;

  /**
   * Build a full Graph API URL for a given relative path.
   * Path should start with a slash, e.g. "/me/accounts".
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${metaConfig.graphBaseUrl}${cleanPath}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, v);
        }
      });
    }
    return url.toString();
  }

  /**
   * Execute an HTTP GET request to the Graph API with retry and timeout.
   */
  async get<T>(path: string, accessToken?: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url, accessToken);
  }

  /**
   * Execute an HTTP POST request to the Graph API.
   * (Phase 3: Publishing posts, reels, stories)
   */
  async post<T>(path: string, accessToken?: string, body?: Record<string, unknown>): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, accessToken, body);
  }

  /**
   * Execute an HTTP DELETE request to the Graph API.
   * (Phase 3: Deleting content/comments)
   */
  async delete<T>(path: string, accessToken?: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("DELETE", url, accessToken);
  }

  /**
   * Core request engine with timeout & retry handling.
   */
  private async request<T>(
    method: string,
    url: string,
    accessToken?: string,
    body?: Record<string, unknown>,
    attempt = 1
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    let options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        // Attempt retry on 5xx server errors
        if (response.status >= 500 && attempt <= this.maxRetries) {
          const backoff = attempt * 1000;
          console.warn(`[Meta Graph API] ${method} ${url} failed (${response.status}). Retrying in ${backoff}ms (attempt ${attempt}/${this.maxRetries})...`);
          await new Promise((r) => setTimeout(r, backoff));
          return this.request<T>(method, url, accessToken, body, attempt + 1);
        }

        // Try parsing Graph API error structure
        let errorJson: MetaGraphErrorPayload | null = null;
        try {
          errorJson = (await response.json()) as MetaGraphErrorPayload;
        } catch {
          // Response body was not JSON
        }

        if (errorJson?.error) {
          const err = errorJson.error;
          console.error(`[Meta Graph API Error] ${method} ${url} → Code ${err.code}: ${err.message}`);
          throw new MetaClientError(err.message, err.code, err.type, err.error_subcode);
        }

        throw new Error(`[Meta Graph API] ${method} request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof MetaClientError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`[Meta Graph API] Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    }
  }
}

export const metaClient = new MetaClient();
