/**
 * Studio AI Research Agent Orchestrator
 * Coordinates the full research lifecycle:
 * Search -> Deep Inspection -> Claim Verification -> Temporal Consistency -> Evidence Dossier -> Main AI
 */

import { searchRegistry } from "./search-provider";
import { inspectSourcesInParallel, inspectUrl } from "./source-inspector";
import { verifyClaimsAndContradictions } from "./verification-engine";
import { buildEvidenceDossier, formatDossierForMainAI } from "./dossier-builder";
import type { EvidenceDossier, InspectedSource, ProgressCallback } from "./types";
import { extractUrls, formulateSearchQuery } from "../web-agent";

export interface ResearchAgentResult {
  dossier: EvidenceDossier;
  contextText: string;
  sources: { title: string; url: string; snippet: string; domain: string }[];
  isWebSearch: boolean;
  query: string;
}

/**
 * Execute the complete Research Agent Pipeline for a user query.
 */
export async function executeResearchAgent(
  message: string,
  onProgress?: ProgressCallback,
  aiMode: "normal" | "web" = "normal"
): Promise<ResearchAgentResult> {
  const directUrls = extractUrls(message);
  let targetQuery = directUrls.length > 0 ? directUrls[0] : formulateSearchQuery(message);

  console.log(`[ResearchAgent] 🔬 Initiating deep research for: "${targetQuery}"`);

  // ─── Stage 1: Searching the web ───
  onProgress?.({
    stage: "searching_web",
    message: "Searching the web…",
    detail: `Query: "${targetQuery}"`,
  });

  let candidateUrls: string[] = [];

  if (directUrls.length > 0) {
    candidateUrls = directUrls.slice(0, 3);
  } else {
    // Discovery search
    const searchResults = await searchRegistry.search(targetQuery, 6);
    
    // If user explicitly asks for original papers / primary sources / avoiding blogs
    const userWantsPrimary = /\b(paper itself|original paper|research paper|arxiv|neurips|nips|primary source|authoritative|not blogs?|not summaries)\b/i.test(message);
    if (userWantsPrimary) {
      searchResults.sort((a, b) => {
        const aBlog = /medium\.com|plainenglish|towardsdatascience|blogspot|wordpress|substack/i.test(a.url);
        const bBlog = /medium\.com|plainenglish|towardsdatascience|blogspot|wordpress|substack/i.test(b.url);
        const aPrimary = /arxiv\.org|neurips|nips|openreview|acm\.org|ieee\.org|\.pdf|\.edu|\.gov/i.test(a.url);
        const bPrimary = /arxiv\.org|neurips|nips|openreview|acm\.org|ieee\.org|\.pdf|\.edu|\.gov/i.test(b.url);
        if (aPrimary && !bPrimary) return -1;
        if (!aPrimary && bPrimary) return 1;
        if (aBlog && !bBlog) return 1;
        if (!aBlog && bBlog) return -1;
        return 0;
      });
    }

    candidateUrls = searchResults.map((r) => r.url);
  }

  // ─── Stage 2: Finding relevant sources ───
  onProgress?.({
    stage: "finding_sources",
    message: "Finding relevant sources…",
    sourcesCount: candidateUrls.length,
  });

  if (candidateUrls.length === 0) {
    console.warn(`[ResearchAgent] No discovery candidates found for: "${targetQuery}"`);
    const emptyDossier = buildEvidenceDossier(targetQuery, [], [], []);
    return {
      dossier: emptyDossier,
      contextText: formatDossierForMainAI(emptyDossier),
      sources: [],
      isWebSearch: true,
      query: targetQuery,
    };
  }

  // ─── Stage 3: Opening & Inspecting sources in parallel ───
  onProgress?.({
    stage: "opening_sources",
    message: "Opening sources…",
    inspectedCount: Math.min(candidateUrls.length, 5),
  });

  const inspectedSources: InspectedSource[] = await inspectSourcesInParallel(candidateUrls, 5, 6500);
  const accessibleSources = inspectedSources.filter((s) => s.accessible);

  // ─── Stage 4: Verifying claims ───
  onProgress?.({
    stage: "verifying_claims",
    message: "Verifying claims…",
    detail: `Inspecting text across ${accessibleSources.length} accessible sources`,
  });

  const { verifiedClaims, contradictions, unresolvedQuestions, summaryOfEvidence } =
    await verifyClaimsAndContradictions(targetQuery, inspectedSources);

  // ─── Stage 5: Checking dates & temporal consistency ───
  onProgress?.({
    stage: "checking_dates",
    message: "Checking dates…",
    detail: `Validating event timelines against current runtime date`,
  });

  // ─── Stage 6: Cross-checking information & contradictions ───
  onProgress?.({
    stage: "cross_checking",
    message: "Cross-checking information…",
    detail: contradictions.length > 0 ? `Detected ${contradictions.length} disputed claims` : "Corroborating independent sources",
  });

  // ─── Stage 7: Preparing answer & Evidence Dossier ───
  onProgress?.({
    stage: "preparing_answer",
    message: "Preparing answer…",
  });

  const dossier = buildEvidenceDossier(
    targetQuery,
    inspectedSources,
    verifiedClaims,
    contradictions,
    unresolvedQuestions,
    summaryOfEvidence
  );

  const contextText = formatDossierForMainAI(dossier);

  const cleanSources = accessibleSources.map((s) => ({
    title: s.title,
    url: s.url,
    snippet: s.text.slice(0, 300),
    domain: s.domain,
  }));

  return {
    dossier,
    contextText,
    sources: cleanSources,
    isWebSearch: true,
    query: targetQuery,
  };
}
