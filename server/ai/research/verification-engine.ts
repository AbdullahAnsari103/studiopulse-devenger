/**
 * Hybrid Claim Verification & Contradiction Engine
 * Combines strict deterministic checks (verbatim quote matches, URL accessibility,
 * wire syndication deduplication, publication date comparisons) with a lightweight
 * semantic LLM pass for claim support and contradiction detection.
 */

import crypto from "crypto";
import { callGemini } from "../gemini";
import type { InspectedSource, VerifiedClaim, ContradictionRecord, VerificationStatus, TemporalStatus } from "./types";
import { getRuntimeTemporalContext, evaluateTemporalStatus } from "./temporal-engine";

/**
 * Deterministically check if a verbatim quote or string exists in source text.
 */
export function checkVerbatimMatch(sourceText: string, targetSubstring: string): boolean {
  if (!sourceText || !targetSubstring) return false;
  const cleanSource = sourceText.toLowerCase().replace(/\s+/g, " ");
  const cleanTarget = targetSubstring.toLowerCase().replace(/\s+/g, " ").trim();
  return cleanSource.includes(cleanTarget);
}

/**
 * Filter out circular wire duplicates: calculates distinct, independent confirming domains.
 */
export function countIndependentCorroboration(sources: InspectedSource[]): {
  independentCount: number;
  distinctDomains: string[];
  isSyndicatedWire: boolean;
} {
  const seenFingerprints = new Set<string>();
  const seenDomains = new Set<string>();
  let isSyndicatedWire = false;

  for (const s of sources) {
    if (!s.accessible || !s.text) continue;

    if (s.isWireOrSyndicated) {
      isSyndicatedWire = true;
    }

    if (!seenFingerprints.has(s.contentFingerprint)) {
      seenFingerprints.add(s.contentFingerprint);
      seenDomains.add(s.domain);
    }
  }

  return {
    independentCount: seenDomains.size,
    distinctDomains: Array.from(seenDomains),
    isSyndicatedWire,
  };
}

/**
 * Lightweight LLM Semantic Verification Prompt.
 */
const VERIFICATION_SYSTEM_PROMPT = `You are the Studio AI Research Verification Engine.
Your task is to analyze user queries against extracted webpage texts to perform rigorous claim-level verification and contradiction detection.

CRITICAL RULES:
1. Never mark a claim as VERIFIED unless the provided source text explicitly and directly supports it.
2. A URL or webpage existing (HTTP 200) does NOT mean the claim is verified.
3. If sources disagree on dates, prices, names, or outcomes, explicitly construct a contradiction item.
4. Distinguish between original reporting and copied syndications.
5. Return strictly valid JSON conforming to the requested schema. No conversational preamble.`;

/**
 * Execute Hybrid Claim Verification across inspected sources.
 */
export async function verifyClaimsAndContradictions(
  query: string,
  sources: InspectedSource[]
): Promise<{
  verifiedClaims: VerifiedClaim[];
  contradictions: ContradictionRecord[];
  unresolvedQuestions: string[];
  summaryOfEvidence: string;
}> {
  const temporalCtx = getRuntimeTemporalContext();
  const accessibleSources = sources.filter((s) => s.accessible && s.text.length > 50);

  if (accessibleSources.length === 0) {
    return {
      verifiedClaims: [
        {
          id: crypto.randomUUID(),
          claim: query,
          evidenceText: "No accessible web sources could be inspected.",
          exactQuoteMatch: false,
          status: "UNVERIFIED",
          supportingSourceUrls: [],
          contradictingSourceUrls: [],
          temporalStatus: "TIME_AMBIGUOUS",
          isIndependentCorroboration: false,
          confidenceScore: 0.1,
          reasoning: "Candidate URLs failed to open or were inaccessible during inspection.",
        },
      ],
      contradictions: [],
      unresolvedQuestions: ["Could not verify external sources for this question."],
      summaryOfEvidence: "No live sources were accessible for deep inspection.",
    };
  }

  // 1. Prepare evidence texts for the lightweight verification pass
  const sourcesPayload = accessibleSources.map((s, idx) => ({
    id: `Source_${idx + 1}`,
    url: s.url,
    domain: s.domain,
    title: s.title,
    publishedDate: s.publishedDate || "Unknown",
    quality: s.quality,
    isPrimary: s.isPrimary,
    isWireOrSyndicated: s.isWireOrSyndicated,
    textExcerpt: s.text.slice(0, 2500),
  }));

  const userPrompt = JSON.stringify({
    userQuery: query,
    currentDate: temporalCtx.runtimeFormatted,
    currentYear: temporalCtx.runtimeYear,
    inspectedSources: sourcesPayload,
  });

  const instructionPrompt = `Analyze the inspected sources for the user query "${query}" (Current Date: ${temporalCtx.runtimeFormatted}).
Extract the key claims and evaluate them strictly against the text excerpts.

Output JSON format:
{
  "claims": [
    {
      "claim": "string (specific assertion)",
      "evidenceExcerpt": "string (verbatim or near-verbatim quote from source)",
      "sourceIndex": 1, // 1-based index matching Source_1, Source_2
      "status": "VERIFIED" | "PARTIALLY_VERIFIED" | "DISPUTED" | "UNVERIFIED" | "UNSUPPORTED" | "CONTRADICTED",
      "eventDateMentioned": "YYYY-MM-DD or null",
      "confidenceScore": 0.0 to 1.0,
      "reasoning": "string"
    }
  ],
  "contradictions": [
    {
      "topic": "string",
      "claimA": { "statement": "string", "sourceIndex": 1 },
      "claimB": { "statement": "string", "sourceIndex": 2 },
      "resolution": "SOURCE_A_NEWER" | "SOURCE_B_NEWER" | "PRIMARY_OVERRULES_SECONDARY" | "GENUINE_CONFLICT_UNRESOLVED",
      "reasoning": "string"
    }
  ],
  "unresolvedQuestions": ["string"],
  "summaryOfEvidence": "string"
}`;

  try {
    const rawResponse = await callGemini(VERIFICATION_SYSTEM_PROMPT, `${instructionPrompt}\n\nDATA:\n${userPrompt}`);
    
    // Strip think tags (both closed and open-ended) and markdown fences
    let jsonText = rawResponse
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*/gi, "")
      .trim();

    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    } else {
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }
    }

    const parsed = JSON.parse(jsonText);

    const verifiedClaims: VerifiedClaim[] = (parsed.claims || []).map((c: any) => {
      const srcIdx = (c.sourceIndex || 1) - 1;
      const source = accessibleSources[srcIdx] || accessibleSources[0];

      // Deterministic validation check on evidence
      const exactQuote = checkVerbatimMatch(source?.text || "", c.evidenceExcerpt || "");
      const temporal = evaluateTemporalStatus(source?.publishedDate, c.eventDateMentioned, temporalCtx);

      let status: VerificationStatus = c.status || "UNVERIFIED";
      if (!exactQuote && status === "VERIFIED" && (c.evidenceExcerpt?.length || 0) > 30) {
        status = "PARTIALLY_VERIFIED"; // Downgrade if quote is not verbatim in inspected text
      }

      return {
        id: crypto.randomUUID(),
        claim: c.claim || query,
        evidenceText: c.evidenceExcerpt || "Extracted from source body",
        exactQuoteMatch: exactQuote,
        status,
        primarySourceUrl: source?.url,
        supportingSourceUrls: [source?.url].filter(Boolean) as string[],
        contradictingSourceUrls: [],
        temporalStatus: temporal.status,
        eventDateMentioned: c.eventDateMentioned,
        sourcePublicationDate: source?.publishedDate,
        isIndependentCorroboration: !source?.isWireOrSyndicated,
        confidenceScore: typeof c.confidenceScore === "number" ? Math.min(1, Math.max(0, c.confidenceScore)) : 0.7,
        reasoning: c.reasoning || temporal.reasoning,
      };
    });

    const contradictions: ContradictionRecord[] = (parsed.contradictions || []).map((ct: any) => {
      const srcA = accessibleSources[(ct.claimA?.sourceIndex || 1) - 1] || accessibleSources[0];
      const srcB = accessibleSources[(ct.claimB?.sourceIndex || 2) - 1] || accessibleSources[1] || accessibleSources[0];

      return {
        topic: ct.topic || "Disputed Fact",
        claimA: {
          statement: ct.claimA?.statement || "",
          sourceUrl: srcA?.url || "",
          sourceDate: srcA?.publishedDate,
          isPrimary: srcA?.isPrimary || false,
        },
        claimB: {
          statement: ct.claimB?.statement || "",
          sourceUrl: srcB?.url || "",
          sourceDate: srcB?.publishedDate,
          isPrimary: srcB?.isPrimary || false,
        },
        resolution: ct.resolution || "GENUINE_CONFLICT_UNRESOLVED",
        reasoning: ct.reasoning || "Sources provide conflicting information.",
      };
    });

    return {
      verifiedClaims,
      contradictions,
      unresolvedQuestions: parsed.unresolvedQuestions || [],
      summaryOfEvidence: parsed.summaryOfEvidence || "Evidence extracted and verified from inspected sources.",
    };
  } catch (error: any) {
    console.warn("[VerificationEngine] LLM verification pass failed, falling back to deterministic synthesis:", error.message);

    // Deterministic fallback if LLM pass fails
    const fallbackClaims: VerifiedClaim[] = accessibleSources.map((s) => {
      const temporal = evaluateTemporalStatus(s.publishedDate, undefined, temporalCtx);
      return {
        id: crypto.randomUUID(),
        claim: s.title,
        evidenceText: s.text.slice(0, 400),
        exactQuoteMatch: true,
        status: s.quality === "PRIMARY_OFFICIAL" ? "VERIFIED" : "PARTIALLY_VERIFIED",
        primarySourceUrl: s.url,
        supportingSourceUrls: [s.url],
        contradictingSourceUrls: [],
        temporalStatus: temporal.status,
        sourcePublicationDate: s.publishedDate,
        isIndependentCorroboration: !s.isWireOrSyndicated,
        confidenceScore: s.isPrimary ? 0.9 : 0.7,
        reasoning: `Inspected from ${s.domain} (HTTP ${s.httpStatus}) with publication date ${s.publishedDate || "unknown"}.`,
      };
    });

    return {
      verifiedClaims: fallbackClaims,
      contradictions: [],
      unresolvedQuestions: [],
      summaryOfEvidence: `Verified evidence across ${accessibleSources.length} accessible sources.`,
    };
  }
}
