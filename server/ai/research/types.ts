/**
 * Research Agent Type Definitions
 * Complete domain types for claim-level verification, temporal reasoning,
 * source inspection, and structured evidence dossier construction.
 */

export type VerificationStatus =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "DISPUTED"
  | "UNVERIFIED"
  | "UNSUPPORTED"
  | "CONTRADICTED";

export type SourceQuality =
  | "PRIMARY_OFFICIAL"      // Government, official orgs, primary company documentation, verified specs
  | "REPUTABLE_NEWS"        // Major independent journalism (Reuters, AP, BBC, The Verge, etc.)
  | "EXPERT_ANALYSIS"       // Peer-reviewed papers, specialized industry benchmarks
  | "SECONDARY_REPORT"      // General publications citing other reports
  | "AGGREGATOR_BLOG"       // Forum posts, content farms, user blogs
  | "UNKNOWN";

export type TemporalStatus =
  | "CURRENT"               // Actively up-to-date as of runtime date
  | "HISTORICAL"            // Past event accurately described as completed
  | "OUTDATED_PREDICTION"   // Past speculation/prediction that never happened or was superseded
  | "UPCOMING"              // Confirmed future event scheduled after runtime date
  | "TIME_AMBIGUOUS";       // Insufficient date data to anchor timeline

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  rank: number;
  provider: "duckduckgo" | "tavily" | "brave" | "direct_url";
}

export interface InspectedSource {
  url: string;
  finalUrl: string;
  domain: string;
  title: string;
  text: string;
  html?: string;
  httpStatus: number;
  accessible: boolean;
  publishedDate?: string;     // ISO format YYYY-MM-DD or full ISO
  modifiedDate?: string;
  dateSource?: "json-ld" | "meta" | "time-tag" | "url" | "text" | "none";
  quality: SourceQuality;
  isPrimary: boolean;
  isWireOrSyndicated: boolean;
  wireAgency?: string;        // e.g., "Reuters", "AP", "PR Newswire", "Business Wire"
  contentFingerprint: string; // Minified text hash for duplicate detection
  errorMessage?: string;
}

export interface VerifiedClaim {
  id: string;
  claim: string;
  evidenceText: string;
  exactQuoteMatch: boolean;
  status: VerificationStatus;
  primarySourceUrl?: string;
  supportingSourceUrls: string[];
  contradictingSourceUrls: string[];
  temporalStatus: TemporalStatus;
  eventDateMentioned?: string;
  sourcePublicationDate?: string;
  isIndependentCorroboration: boolean; // false if multiple sites merely copy same press release
  confidenceScore: number;             // 0.0 to 1.0
  reasoning: string;
}

export interface ContradictionRecord {
  topic: string;
  claimA: {
    statement: string;
    sourceUrl: string;
    sourceDate?: string;
    isPrimary: boolean;
  };
  claimB: {
    statement: string;
    sourceUrl: string;
    sourceDate?: string;
    isPrimary: boolean;
  };
  resolution:
    | "SOURCE_A_NEWER"
    | "SOURCE_B_NEWER"
    | "PRIMARY_OVERRULES_SECONDARY"
    | "GENUINE_CONFLICT_UNRESOLVED";
  reasoning: string;
}

export interface EvidenceDossier {
  query: string;
  runtimeDate: string;        // e.g. "2026-08-20T21:05:00.000Z"
  runtimeDateFormatted: string; // e.g. "August 20, 2026"
  inspectedSources: InspectedSource[];
  verifiedClaims: VerifiedClaim[];
  contradictions: ContradictionRecord[];
  unresolvedQuestions: string[];
  overallConfidence: "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED";
  summaryOfEvidence: string;
}

export type ResearchProgressStage =
  | "searching_web"
  | "finding_sources"
  | "opening_sources"
  | "verifying_claims"
  | "checking_dates"
  | "cross_checking"
  | "preparing_answer";

export interface ResearchProgressEvent {
  stage: ResearchProgressStage;
  message: string;
  detail?: string;
  sourcesCount?: number;
  inspectedCount?: number;
}

export type ProgressCallback = (event: ResearchProgressEvent) => void;
