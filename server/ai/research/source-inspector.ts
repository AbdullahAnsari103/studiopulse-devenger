/**
 * Source Inspector & Deep Content Extractor
 * Concurrently scrapes candidate URLs, extracts clean DOM text, parses ISO dates,
 * detects wire syndication, and computes domain quality & content fingerprints.
 */

import crypto from "crypto";
import type { InspectedSource, SourceQuality } from "./types";

/**
 * Domain classification lists for authority & primary source scoring.
 */
const PRIMARY_OFFICIAL_DOMAINS = new Set([
  "nasa.gov",
  "whitehouse.gov",
  "cdc.gov",
  "who.int",
  "nih.gov",
  "arxiv.org",
  "proceedings.neurips.cc",
  "papers.nips.cc",
  "neurips.cc",
  "openreview.net",
  "acm.org",
  "ieee.org",
  "semanticscholar.org",
  "nature.com",
  "science.org",
  "biorxiv.org",
  "medrxiv.org",
  "springer.com",
  "sciencedirect.com",
  "pnas.org",
  "jmlr.org",
  "aclweb.org",
  "aaai.org",
  "w3.org",
  "github.com",
  "developer.mozilla.org",
  "support.google.com",
  "support.apple.com",
  "docs.microsoft.com",
]);

const REPUTABLE_NEWS_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theverge.com",
  "arstechnica.com",
  "nature.com",
  "science.org",
  "bloomberg.com",
  "wsj.com",
  "nytimes.com",
  "techcrunch.com",
  "wired.com",
  "engadget.com",
  "theguardian.com",
  "aljazeera.com",
]);

const WIRE_AGENCIES = [
  { name: "Reuters", pattern: /\b(reuters|thomson reuters)\b/i },
  { name: "Associated Press", pattern: /\b(associated press|\bap\b|ap news)\b/i },
  { name: "PR Newswire", pattern: /\b(pr newswire|prnewswire)\b/i },
  { name: "Business Wire", pattern: /\b(business wire|businesswire)\b/i },
  { name: "GlobeNewswire", pattern: /\bglobenewswire\b/i },
  { name: "AFP", pattern: /\b(agence france-presse|\bafp\b)\b/i },
];

/**
 * Clean and normalize HTML into readable article text without external bloat.
 */
export function parseHtmlContent(html: string): {
  title: string;
  text: string;
  extractedDate?: string;
  dateSource?: "json-ld" | "meta" | "time-tag" | "url" | "text" | "none";
  wireAgency?: string;
} {
  // 1. Title Extraction
  const titleMatch =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").trim() : "Webpage";

  // 2. Publication Date Extraction
  let extractedDate: string | undefined;
  let dateSource: "json-ld" | "meta" | "time-tag" | "url" | "text" | "none" = "none";

  // A. Check JSON-LD
  const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      try {
        const rawJson = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
        const parsed = JSON.parse(rawJson);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const dateVal = obj?.datePublished || obj?.dateModified || obj?.uploadDate || obj?.["@graph"]?.[0]?.datePublished;
        if (dateVal && typeof dateVal === "string" && dateVal.length >= 4) {
          extractedDate = new Date(dateVal).toISOString().split("T")[0];
          dateSource = "json-ld";
          break;
        }
      } catch {
        // Skip invalid JSON-LD
      }
    }
  }

  // B. Check Meta Tags if not found in JSON-LD
  if (!extractedDate) {
    const metaDatePatterns = [
      /<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']publish-date["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']pubdate["']\s+content=["']([^"']+)["']/i,
      /<meta\s+name=["']date["']\s+content=["']([^"']+)["']/i,
      /<meta\s+property=["']og:updated_time["']\s+content=["']([^"']+)["']/i,
    ];

    for (const pattern of metaDatePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          const parsed = new Date(match[1]);
          if (!isNaN(parsed.getTime())) {
            extractedDate = parsed.toISOString().split("T")[0];
            dateSource = "meta";
            break;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // C. Check <time datetime="..."> tags
  if (!extractedDate) {
    const timeTagMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
    if (timeTagMatch && timeTagMatch[1]) {
      try {
        const parsed = new Date(timeTagMatch[1]);
        if (!isNaN(parsed.getTime())) {
          extractedDate = parsed.toISOString().split("T")[0];
          dateSource = "time-tag";
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Strip non-content tags
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  // 4. Focus on Article Body
  const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (articleMatch && articleMatch[1].length > 300) {
    clean = articleMatch[1];
  } else if (mainMatch && mainMatch[1].length > 300) {
    clean = mainMatch[1];
  }

  // 5. Strip remaining tags & entities
  clean = clean
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();

  // 6. Check Wire Agency attribution in text
  let wireAgency: string | undefined;
  for (const wire of WIRE_AGENCIES) {
    if (wire.pattern.test(clean.slice(0, 800))) {
      wireAgency = wire.name;
      break;
    }
  }

  return {
    title,
    text: clean,
    extractedDate,
    dateSource,
    wireAgency,
  };
}

/**
 * Classify quality and authority hierarchy of a source.
 */
export function classifySourceQuality(url: string, domain: string, isOfficialCandidate: boolean): SourceQuality {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, "");

  if (cleanDomain.endsWith(".gov") || cleanDomain.endsWith(".mil") || cleanDomain.endsWith(".edu") || PRIMARY_OFFICIAL_DOMAINS.has(cleanDomain) || isOfficialCandidate) {
    return "PRIMARY_OFFICIAL";
  }

  if (REPUTABLE_NEWS_DOMAINS.has(cleanDomain)) {
    return "REPUTABLE_NEWS";
  }

  if (cleanDomain.includes("blog") || cleanDomain.includes("forum") || cleanDomain.includes("reddit.com") || cleanDomain.includes("medium.com") || cleanDomain.includes("substack.com")) {
    return "AGGREGATOR_BLOG";
  }

  return "SECONDARY_REPORT";
}

/**
 * Compute lightweight fingerprint of text to identify copied/syndicated wire articles.
 */
export function computeContentFingerprint(text: string): string {
  // Normalize alphanumeric characters & lower-case first 500 significant chars
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 600);
  return crypto.createHash("md5").update(normalized).digest("hex");
}

/**
 * Deep Inspector: Fetch, inspect, and extract full evidence from a URL with timeout.
 */
export async function inspectUrl(
  url: string,
  timeoutMs: number = 6000
): Promise<InspectedSource> {
  let domain = "";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return {
      url,
      finalUrl: url,
      domain: "invalid",
      title: "Invalid URL",
      text: "",
      httpStatus: 0,
      accessible: false,
      quality: "UNKNOWN",
      isPrimary: false,
      isWireOrSyndicated: false,
      contentFingerprint: "",
      errorMessage: "Invalid URL structure",
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 StudioPulseResearchBot/2.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);

    const finalUrl = response.url || url;
    const finalDomain = new URL(finalUrl).hostname.replace(/^www\./, "");

    if (!response.ok) {
      return {
        url,
        finalUrl,
        domain: finalDomain,
        title: finalDomain,
        text: "",
        httpStatus: response.status,
        accessible: false,
        quality: classifySourceQuality(finalUrl, finalDomain, false),
        isPrimary: false,
        isWireOrSyndicated: false,
        contentFingerprint: "",
        errorMessage: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const parsed = parseHtmlContent(html);
    const quality = classifySourceQuality(finalUrl, finalDomain, false);
    const fingerprint = computeContentFingerprint(parsed.text);

    // Truncate clean body text to 5,000 characters of high-density evidence
    const cleanText = parsed.text.slice(0, 5000);

    return {
      url,
      finalUrl,
      domain: finalDomain,
      title: parsed.title || finalDomain,
      text: cleanText,
      httpStatus: response.status,
      accessible: true,
      publishedDate: parsed.extractedDate,
      dateSource: parsed.dateSource,
      quality,
      isPrimary: quality === "PRIMARY_OFFICIAL",
      isWireOrSyndicated: !!parsed.wireAgency,
      wireAgency: parsed.wireAgency,
      contentFingerprint: fingerprint,
    };
  } catch (error: any) {
    return {
      url,
      finalUrl: url,
      domain,
      title: domain,
      text: "",
      httpStatus: 0,
      accessible: false,
      quality: "UNKNOWN",
      isPrimary: false,
      isWireOrSyndicated: false,
      contentFingerprint: "",
      errorMessage: error.name === "AbortError" ? "Inspection timeout" : error.message,
    };
  }
}

/**
 * Concurrently inspect multiple URLs in parallel with individual error resilience.
 */
export async function inspectSourcesInParallel(
  urls: string[],
  maxParallel: number = 5,
  timeoutMs: number = 6500
): Promise<InspectedSource[]> {
  const targetUrls = urls.slice(0, maxParallel);
  const promises = targetUrls.map((u) => inspectUrl(u, timeoutMs));
  return Promise.all(promises);
}
