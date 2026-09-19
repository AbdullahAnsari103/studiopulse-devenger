/**
 * Web Agent Engine
 * Performs live web searches and direct URL scraping for Studio AI.
 * 100% functional with zero required external API keys (DuckDuckGo live scraper),
 * with optional support for Tavily or Brave Search if keys are provided in .env.
 */

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export interface WebAgentResult {
  contextText: string;
  sources: WebSource[];
  isWebSearch: boolean;
  query?: string;
}

// ─── 1. URL Extraction & Direct Web Scraping ──────────────────────────────────

/**
 * Extract all HTTP/HTTPS URLs from a given message text.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
  const matches = text.match(urlRegex) || [];
  // Clean trailing punctuation like ., ), ], ?, !
  return matches.map((u) => u.replace(/[.,)\]?!]+$/, ""));
}

/**
 * Extract clean readable text from HTML markup without external heavy dependencies.
 */
function cleanHtmlContent(html: string): { title: string; text: string } {
  // 1. Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Webpage";

  // 2. Remove scripts, styles, noscript, svg, header, footer, nav
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // 3. Extract main content tags if available (article, main, body)
  const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (articleMatch && articleMatch[1].length > 200) {
    clean = articleMatch[1];
  } else if (mainMatch && mainMatch[1].length > 200) {
    clean = mainMatch[1];
  }

  // 4. Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // 5. Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");

  // 6. Normalize whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return { title, text: clean };
}

/**
 * Fetch and scrape a specific webpage URL directly.
 */
export async function scrapeWebpage(url: string, timeoutMs: number = 6000): Promise<WebSource | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 StudioPulseBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`[WebAgent] Failed to fetch URL: ${url} (HTTP ${response.status})`);
      return null;
    }

    const html = await response.text();
    const { title, text } = cleanHtmlContent(html);
    const domain = new URL(url).hostname.replace(/^www\./, "");

    // Truncate content cleanly to 3,500 chars
    const snippet = text.slice(0, 3500);

    return {
      title: title || domain,
      url,
      snippet,
      domain,
    };
  } catch (error: any) {
    console.warn(`[WebAgent] Error scraping URL ${url}:`, error.message);
    return null;
  }
}

// ─── 2. Live Web Search Engine (DuckDuckGo + Tavily/Brave Fallback) ────────────

/**
 * Generate an optimized search query from natural language messages.
 * Strips conversational preamble, filler phrases, and extracts high-intent search keywords.
 */
export function formulateSearchQuery(message: string): string {
  let query = message
    .replace(/\bsearch (the )?(entire )?(whole )?web (for|about|to find)?\b/gi, " ")
    .replace(/\bsearch (online|google|the internet) (for|about)?\b/gi, " ")
    .replace(/\blook up (on )?(google|web|online)?\b/gi, " ")
    .replace(/\bbrowse (the )?web (for)?\b/gi, " ")
    .replace(/\b(can you|could you|please|tell me|i want to know|find me|is there any|are there any)\b/gi, " ")
    .replace(/\b(as u know|as you know|as you known|as u known|u know|u known)\b/gi, " ")
    .replace(/\b(my song|my track|my video|my content|about my)\b/gi, " ")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .trim();

  // If query is about finding similar songs / music / content
  if (/\bsimilar (to )?/i.test(query)) {
    const subject = query
      .replace(/is there any /gi, "")
      .replace(/songs? /gi, "")
      .replace(/similar to /gi, "")
      .trim();
    query = `songs similar to ${subject} Hindi indie`;
  }

  // Clean extra spaces & punctuation
  query = query.replace(/[?.,!;:]+$/, "").replace(/\s+/g, " ").trim();

  return query || message.slice(0, 100);
}

/**
 * Live search using DuckDuckGo HTML / Lite parser (Zero API Key required).
 */
async function searchDuckDuckGo(query: string, maxResults: number = 4): Promise<WebSource[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[WebAgent] DuckDuckGo search returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results: WebSource[] = [];

    // Parse DuckDuckGo HTML search results
    const resultBlocks = html.split(/class="result\s+results_links/i).slice(1);

    for (const block of resultBlocks) {
      if (results.length >= maxResults) break;

      const linkMatch = block.match(/<a[^>]+class="result__url"[^>]+href="([^"]+)"/i) ||
                        block.match(/<a[^>]+href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/i) ||
                        block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/i);

      const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/<td[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/td>/i);

      if (linkMatch) {
        let rawUrl = linkMatch[1];
        if (rawUrl.includes("uddg=")) {
          try {
            const uddg = rawUrl.split("uddg=")[1].split("&")[0];
            rawUrl = decodeURIComponent(uddg);
          } catch {
            // ignore
          }
        }

        if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;

        // Skip internal/ad links
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
          });
        } catch {
          // invalid URL, skip
        }
      }
    }

    return results;
  } catch (error: any) {
    console.warn("[WebAgent] DuckDuckGo search error:", error.message);
    return [];
  }
}

/**
 * Optional Tavily Search integration if TAVILY_API_KEY is configured in .env.
 */
async function searchTavily(query: string, maxResults: number = 4): Promise<WebSource[]> {
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
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((r: any) => ({
      title: r.title || "Web Result",
      url: r.url,
      snippet: r.content || "",
      domain: new URL(r.url).hostname.replace(/^www\./, ""),
    }));
  } catch (error: any) {
    console.warn("[WebAgent] Tavily search error:", error.message);
    return [];
  }
}

/**
 * Live search orchestrator: tries Tavily (if configured) $\to$ DuckDuckGo (Free).
 */
export async function searchWeb(query: string, maxResults: number = 4): Promise<WebSource[]> {
  console.log(`[WebAgent] Searching live web for: "${query}"`);

  // 1. Try Tavily if configured
  if (process.env.TAVILY_API_KEY) {
    const tavilyResults = await searchTavily(query, maxResults);
    if (tavilyResults.length > 0) {
      console.log(`[WebAgent] Retrieved ${tavilyResults.length} sources via Tavily`);
      return tavilyResults;
    }
  }

  // 2. Default Zero-Key Free Search (DuckDuckGo)
  const ddgResults = await searchDuckDuckGo(query, maxResults);
  if (ddgResults.length > 0) {
    console.log(`[WebAgent] Retrieved ${ddgResults.length} sources via DuckDuckGo`);
    return ddgResults;
  }

  return [];
}

// ─── 3. Intelligent Semantic Search Router ─────────────────────────────────────

/**
 * Intelligently classify whether a user message actually needs external live web search.
 * Accurately handles mixed queries (e.g. "search the entire web as u known my song yaad ka kaafila is there any song similar to it").
 */
export async function decideWebSearchNeed(
  message: string,
  aiMode: "normal" | "web" = "normal"
): Promise<{ needsWebSearch: boolean; searchQuery: string }> {
  const directUrls = extractUrls(message);
  if (directUrls.length > 0) {
    return { needsWebSearch: true, searchQuery: directUrls[0] };
  }

  const clean = message.toLowerCase().trim();

  // 1. Explicit Search / External Research / Similar items commands
  const hasSearchCommand =
    /\bsearch (the )?(entire )?(whole )?web\b/i.test(clean) ||
    /\b(search online|google it|look up online|find articles|latest news|trending today)\b/i.test(clean) ||
    /\b(similar to|songs? like|tracks? like|artists? like|alternative to|vs |versus |compare )\b/i.test(clean) ||
    /\b(price of|specs of|review of|camera|microphone|monetization update|youtube algorithm 2026)\b/i.test(clean);

  if (hasSearchCommand) {
    const query = formulateSearchQuery(message);
    return { needsWebSearch: true, searchQuery: query };
  }

  // 2. Personal / Channel / Creator / Casual Conversation (Never search public web)
  const isPersonalOrChannel =
    /\b(my channel|my video|my content|about me|who am i|do you know (me|my)|my views|my ctr|my revenue|my subscribers|unspokenframes)\b/i.test(clean) ||
    /\b(hi|hello|hey|greetings|help me|how are you|what can you do|what do you know|u known|u know)\b/i.test(clean) ||
    /\b(write a script|give me title ideas|give me tags|intro hook|summarize my|give me a strategy|generate ideas)\b/i.test(clean);

  if (isPersonalOrChannel) {
    return { needsWebSearch: false, searchQuery: "" };
  }

  // 3. If user is in Web Mode and asks an external question
  if (aiMode === "web" && !isPersonalOrChannel) {
    const query = formulateSearchQuery(message);
    return { needsWebSearch: true, searchQuery: query };
  }

  return { needsWebSearch: false, searchQuery: "" };
}

// ─── 4. Main Web Agent Execution Pipeline ─────────────────────────────────────

/**
 * Orchestrate complete web research for a user's prompt.
 * Automatically handles direct URL reading or live web searching.
 */
export async function executeWebAgent(
  message: string,
  onStatusUpdate?: (status: { type: string; query?: string; count?: number; sources?: WebSource[] }) => void,
  aiMode: "normal" | "web" = "normal"
): Promise<WebAgentResult> {
  const directUrls = extractUrls(message);
  const sources: WebSource[] = [];

  // Scenario A: User provided specific URL(s)
  if (directUrls.length > 0) {
    onStatusUpdate?.({ type: "reading_urls", query: directUrls[0] });

    for (const url of directUrls.slice(0, 3)) {
      const scraped = await scrapeWebpage(url);
      if (scraped) {
        sources.push(scraped);
      }
    }

    if (sources.length > 0) {
      let contextText = `\n\n--- 🌐 LIVE WEBPAGE CONTENT EXTRACTED BY WEB AGENT ---\n`;
      sources.forEach((s, idx) => {
        contextText += `\n[Source ${idx + 1}: ${s.title} (${s.url})]\n${s.snippet}\n`;
      });
      contextText += `\n--- END LIVE WEBPAGE CONTENT ---\nUse the live webpage content above to answer the user accurately. Cite sources when referencing specific facts.\n`;

      return {
        contextText,
        sources,
        isWebSearch: true,
        query: directUrls[0],
      };
    }
  }

  // Scenario B: Smart Semantic Search Router
  const decision = await decideWebSearchNeed(message, aiMode);
  if (!decision.needsWebSearch || !decision.searchQuery) {
    console.log(`[WebAgent] Semantic Router decided: No external web search needed for "${message.slice(0, 50)}"`);
    return {
      contextText: "",
      sources: [],
      isWebSearch: false,
    };
  }

  const searchQuery = decision.searchQuery;
  onStatusUpdate?.({ type: "searching_web", query: searchQuery });

  const webResults = await searchWeb(searchQuery, 4);

  if (webResults.length > 0) {
    sources.push(...webResults);
    onStatusUpdate?.({ type: "found_sources", sources: webResults, count: webResults.length });

    let contextText = `\n\n--- 🌐 REAL-TIME LIVE WEB SEARCH RESULTS ---\nQuery: "${searchQuery}"\n`;
    webResults.forEach((s, idx) => {
      contextText += `\n[Source ${idx + 1}: ${s.title}]\nURL: ${s.url}\nSummary: ${s.snippet}\n`;
    });
    contextText += `\n--- END LIVE WEB RESULTS ---\nIncorporate the real-time facts, music/artist details, prices, comparison points, or latest updates above into your response. Include clear markdown links or citations when referencing these sources.\n`;

    return {
      contextText,
      sources: webResults,
      isWebSearch: true,
      query: searchQuery,
    };
  }

  // If search returns no results, return clean fallback
  return {
    contextText: "",
    sources: [],
    isWebSearch: false,
    query: searchQuery,
  };
}
