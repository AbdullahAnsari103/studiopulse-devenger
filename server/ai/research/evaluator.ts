/**
 * Answer Grounding & Citation Integrity Evaluator
 * Evaluates the complete end-to-end output of the Research Agent + Main AI pipeline.
 * Flags unsupported claims, hallucinated URLs, temporal inconsistencies,
 * ignored contradictions, and "correct conclusion for wrong reasons" errors.
 */

import { extractUrls } from "../web-agent";
import { checkVerbatimMatch } from "./verification-engine";
import { getRuntimeTemporalContext, detectOutdatedFutureTense } from "./temporal-engine";
import type { EvidenceDossier, InspectedSource } from "./types";

export interface EvaluationReport {
  query: string;
  verdict: "PASS" | "FAIL";
  metrics: {
    factualAccuracyScore: number;     // 0 - 100
    citationAccuracyScore: number;    // 0 - 100
    evidenceGroundingScore: number;   // 0 - 100
    temporalAccuracyScore: number;    // 0 - 100
    hallucinationRate: number;        // 0 - 100 (lower is better)
    confidenceCalibrationScore: number; // 0 - 100
  };
  details: {
    citedUrls: string[];
    validUrls: string[];
    hallucinatedUrls: string[];
    unsupportedClaims: string[];
    temporalErrors: string[];
    ignoredContradictions: string[];
    misquotedEvidence: string[];
  };
  reasoning: string;
}

/**
 * Evaluate the generated AI answer against the verified Evidence Dossier.
 */
export function evaluateAnswerGrounding(
  query: string,
  dossier: EvidenceDossier,
  generatedAnswer: string
): EvaluationReport {
  const temporalCtx = getRuntimeTemporalContext();
  const answerUrls = extractUrls(generatedAnswer);
  const validDossierUrls = new Set(
    dossier.inspectedSources.map((s) => s.url.toLowerCase().trim().replace(/\/$/, ""))
  );

  // ─── 1. Citation & URL Integrity Check ───
  const validUrls: string[] = [];
  const hallucinatedUrls: string[] = [];

  for (const url of answerUrls) {
    const cleanUrl = url.toLowerCase().trim().replace(/\/$/, "");
    if (validDossierUrls.has(cleanUrl)) {
      validUrls.push(url);
    } else {
      // Check if domain at least matches any inspected domain
      try {
        const domain = new URL(url).hostname.replace(/^www\./, "");
        const matched = dossier.inspectedSources.some((s) => s.domain === domain);
        if (matched) {
          validUrls.push(url);
        } else {
          hallucinatedUrls.push(url);
        }
      } catch {
        hallucinatedUrls.push(url);
      }
    }
  }

  // ─── 2. Evidence Grounding & Claim Extraction ───
  const unsupportedClaims: string[] = [];
  const misquotedEvidence: string[] = [];

  // Extract quoted text within quotes in the generated answer (e.g. "quote")
  const quoteMatches = generatedAnswer.match(/"([^"]{15,})"/g) || [];
  for (const quoteWithQuotes of quoteMatches) {
    const rawQuote = quoteWithQuotes.replace(/^"|"$/g, "");
    let quoteFoundInAnySource = false;

    for (const src of dossier.inspectedSources) {
      if (src.accessible && checkVerbatimMatch(src.text, rawQuote)) {
        quoteFoundInAnySource = true;
        break;
      }
    }

    if (!quoteFoundInAnySource) {
      misquotedEvidence.push(`Quoted text "${rawQuote.slice(0, 60)}..." not found verbatim in any inspected source.`);
    }
  }

  // ─── 3. Temporal Consistency & Outdated Prediction Check ───
  const temporalErrors: string[] = [];
  const outdatedCheck = detectOutdatedFutureTense(generatedAnswer, undefined, temporalCtx);
  if (outdatedCheck.isOutdatedPrediction) {
    temporalErrors.push(outdatedCheck.warning || "Answer used future-tense prediction for past year.");
  }

  // Check if answer treats an old year as the current state
  const mentionsOldYearAsFuture = new RegExp(`\\b(will\\s+(?:launch|release|occur|happen)\\s+in\\s+(?:2020|2021|2022|2023|2024|2025))\\b`, "i").test(
    generatedAnswer
  );
  if (mentionsOldYearAsFuture) {
    temporalErrors.push("Answer incorrectly used future tense for a completed past year (2020-2025).");
  }

  // ─── 4. Contradiction Handling Check ───
  const ignoredContradictions: string[] = [];
  if (dossier.contradictions.length > 0) {
    for (const conflict of dossier.contradictions) {
      const topicKeywords = conflict.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const isTopicMentioned = topicKeywords.some((kw) => generatedAnswer.toLowerCase().includes(kw));

      if (isTopicMentioned) {
        // Check if answer transparently noted the conflict/dispute/disagreement
        const acknowledgesDispute =
          /\b(conflict|dispute|disagree|different reports|some sources|however|contrasting|unclear|superseded|delayed)\b/i.test(
            generatedAnswer
          );
        if (!acknowledgesDispute) {
          ignoredContradictions.push(`Failed to acknowledge detected conflict regarding "${conflict.topic}".`);
        }
      }
    }
  }

  // ─── 5. Confidence & Safety Rule Calibration ───
  let confidenceCalibrationScore = 100;
  if (dossier.overallConfidence === "UNVERIFIED" || dossier.overallConfidence === "LOW") {
    const admitsUncertainty =
      /\b(unverified|unconfirmed|limited evidence|not confirmed|could not verify|unable to verify|sources unavailable|restricted|conflict|conflicting|dispute|disputed|contradiction|delayed|not an independent|do not constitute independent|premise of your question is incorrect)\b/i.test(
        generatedAnswer
      );
    if (!admitsUncertainty) {
      confidenceCalibrationScore = 40;
      unsupportedClaims.push("Evidence dossier was marked UNVERIFIED/LOW, but the AI answer claimed certainty without noting limitations.");
    }
  }

  // ─── 6. Compute Individual Metrics ───
  const totalUrls = answerUrls.length;
  const citationAccuracyScore = totalUrls === 0 ? 100 : Math.round((validUrls.length / totalUrls) * 100);
  const hallucinationRate = Math.round(((hallucinatedUrls.length + misquotedEvidence.length) / Math.max(1, totalUrls + 1)) * 50);
  const temporalAccuracyScore = temporalErrors.length === 0 ? 100 : Math.max(0, 100 - temporalErrors.length * 50);
  const evidenceGroundingScore = Math.max(
    0,
    100 - misquotedEvidence.length * 30 - unsupportedClaims.length * 25 - hallucinatedUrls.length * 35
  );
  const factualAccuracyScore = Math.round(
    (citationAccuracyScore * 0.35 + evidenceGroundingScore * 0.35 + temporalAccuracyScore * 0.3)
  );

  // ─── 7. Final Verdict (Must Fail if Hallucinated URLs or Fabricated Evidence) ───
  let verdict: "PASS" | "FAIL" = "PASS";
  let failureReasons: string[] = [];

  if (hallucinatedUrls.length > 0) {
    verdict = "FAIL";
    failureReasons.push(`Hallucinated ${hallucinatedUrls.length} fake URL(s)`);
  }
  if (misquotedEvidence.length > 0) {
    verdict = "FAIL";
    failureReasons.push(`Fabricated ${misquotedEvidence.length} quote(s)`);
  }
  if (temporalErrors.length > 0) {
    verdict = "FAIL";
    failureReasons.push(`Temporal chronology error: ${temporalErrors.join("; ")}`);
  }
  if (ignoredContradictions.length > 0) {
    verdict = "FAIL";
    failureReasons.push(`Ignored ${ignoredContradictions.length} source contradiction(s)`);
  }
  if (unsupportedClaims.length > 0 && dossier.overallConfidence === "UNVERIFIED") {
    verdict = "FAIL";
    failureReasons.push("Stated unverified facts with unwarranted certainty");
  }

  const reasoning =
    verdict === "PASS"
      ? "Answer is strictly grounded in inspected evidence, cites verified URLs, adheres to current runtime date, and preserves source nuances."
      : `Evaluation Failed: ${failureReasons.join(" | ")}`;

  return {
    query,
    verdict,
    metrics: {
      factualAccuracyScore,
      citationAccuracyScore,
      evidenceGroundingScore,
      temporalAccuracyScore,
      hallucinationRate,
      confidenceCalibrationScore,
    },
    details: {
      citedUrls: answerUrls,
      validUrls,
      hallucinatedUrls,
      unsupportedClaims,
      temporalErrors,
      ignoredContradictions,
      misquotedEvidence,
    },
    reasoning,
  };
}
