/**
 * Pluggable Web Search Provider Architecture
 * Supports zero-key DuckDuckGo discovery, with optional Tavily/Brave support if keys exist.
 */

import type { RawSearchResult } from "./types";

export interface ISearchProvider {
  name: string;
  isAvailable(): boolean;
  search(query: string, maxResults?: number): Promise<RawSearchResult[]>;
}

/**
 * Zero-key DuckDuckGo HTML / Lite Parser.
 * Discovers search candidates without requiring any API keys.
 */
export class DuckDuckGoSearchProvider implements ISearchProvider {
  name = "duckduckgo";

  isAvailable(): boolean {
    return true; // Always available
  }

  async search(query: string, maxResults: number = 6): Promise<RawSearchResult[]> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.warn(`[DuckDuckGo] Returned HTTP ${res.status}`);
        return [];
      }

      const html = await res.text();
      const results: RawSearchResult[] = [];

      const resultBlocks = html.split(/class="result\s+results_links/i).slice(1);

      let rank = 1;
      for (const block of resultBlocks) {
        if (results.length >= maxResults) break;

        const linkMatch =
          block.match(/<a[^>]+class="result__url"[^>]+href="([^"]+)"/i) ||
          block.match(/<a[^>]+href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/i) ||
          block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/i);

        const snippetMatch =
          block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
          block.match(/<td[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/td>/i);

        if (linkMatch) {
          let rawUrl = linkMatch[1];
          if (rawUrl.includes("uddg=")) {
            try {
              const uddg = rawUrl.split("uddg=")[1].split("&")[0];
              rawUrl = decodeURIComponent(uddg);
            } catch {
              // ignore decode error
            }
          }

          if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;

          // Skip internal DuckDuckGo tracker links or malformed URLs
          if (rawUrl.includes("duckduckgo.com") || !rawUrl.startsWith("http")) continue;

          let title = "";
          const titleTagMatch = block.match(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
          if (titleTagMatch) {
            title = titleTagMatch[1].replace(/<[^>]+>/g, "").trim();
          }

          let snippet = "";
          if (snippetMatch) {
            snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
          }

          try {
            const domain = new URL(rawUrl).hostname.replace(/^www\./, "");
            results.push({
              title: title || domain,
              url: rawUrl,
              snippet: snippet || `Information from ${domain}`,
              domain,
              rank: rank++,
              provider: "duckduckgo",
            });
          } catch {
            // Invalid URL format
          }
        }
      }

      return results;
    } catch (error: any) {
      console.warn("[DuckDuckGo] Search failed:", error.message);
      return [];
    }
  }
}

/**
 * Optional Tavily Search Provider (if TAVILY_API_KEY exists in .env).
 */
export class TavilySearchProvider implements ISearchProvider {
  name = "tavily";

  isAvailable(): boolean {
    return !!process.env.TAVILY_API_KEY;
  }

  async search(query: string, maxResults: number = 6): Promise<RawSearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return [];

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          search_depth: "advanced",
          include_answer: false,
        }),
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!data.results) return [];

      return data.results.map((r: any, idx: number) => ({
        title: r.title || "Web Result",
        url: r.url,
        snippet: r.content || "",
        domain: new URL(r.url).hostname.replace(/^www\./, ""),
        rank: idx + 1,
        provider: "tavily",
      }));
    } catch (error: any) {
      console.warn("[Tavily] Search error:", error.message);
      return [];
    }
  }
}

/**
 * Search Orchestration Registry: Executes discovery across active providers.
 */
export class SearchRegistry {
  private providers: ISearchProvider[] = [
    new TavilySearchProvider(),
    new DuckDuckGoSearchProvider(),
  ];

  async search(query: string, maxResults: number = 6): Promise<RawSearchResult[]> {
    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        try {
          const results = await provider.search(query, maxResults);
          if (results.length > 0) {
            console.log(`[SearchRegistry] Retrieved ${results.length} discovery candidates via ${provider.name}`);
            return results;
          }
        } catch (err: any) {
          console.warn(`[SearchRegistry] Provider ${provider.name} failed:`, err.message);
        }
      }
    }
    return [];
  }
}

export const searchRegistry = new SearchRegistry();
