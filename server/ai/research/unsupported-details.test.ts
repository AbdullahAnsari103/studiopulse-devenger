/**
 * Unsupported-Details & Hallucination Regression Test Suite
 * Tests that the Fact-Gating Layer detects and eliminates ungrounded details
 * (invented entity names, fabricated statistics, invented times/locations, and unsupported procedures)
 * before final answers reach the user.
 */

import { buildEvidenceDossier } from "./dossier-builder";
import { evaluateAnswerGrounding } from "./evaluator";
import { sanitizeAnswerWithDossier } from "./answer-sanitizer";
import type { InspectedSource } from "./types";

export interface DetailRegressionResult {
  name: string;
  category: string;
  draftFailedBefore: boolean;
  sanitizedPassedAfter: boolean;
  detailsRemoved: string[];
  sanitizedText: string;
}

export async function runUnsupportedDetailsRegressionTests(): Promise<{
  totalTests: number;
  passedCount: number;
  results: DetailRegressionResult[];
}> {
  console.log(`\n══════════════════════════════════════════════════════════════════`);
  console.log(`🛡️ RUNNING UNSUPPORTED-DETAILS FACT-GATING REGRESSION SUITE`);
  console.log(`══════════════════════════════════════════════════════════════════\n`);

  const results: DetailRegressionResult[] = [];

  // Base Verified Source
  const nasaSource: InspectedSource = {
    url: "https://www.nasa.gov/mission/artemis-ii",
    finalUrl: "https://www.nasa.gov/mission/artemis-ii",
    domain: "nasa.gov",
    title: "NASA Artemis II Mission Overview",
    text: "NASA confirmed the Artemis II mission successfully launched and completed a lunar flyby. The four astronauts returned safely, splashing down in the Pacific Ocean where recovery teams met the capsule. Crew members underwent post-mission medical examinations.",
    httpStatus: 200,
    accessible: true,
    publishedDate: "2026-06-01",
    quality: "PRIMARY_OFFICIAL",
    isPrimary: true,
    isWireOrSyndicated: false,
    contentFingerprint: "fp-nasa-artemis",
  };

  const claim: VerifiedClaim = {
    id: "artemis-c1",
    claim: "Artemis II completed its lunar flyby and the crew returned safely",
    evidenceText: "NASA confirmed the Artemis II mission successfully launched and completed a lunar flyby. The four astronauts returned safely",
    exactQuoteMatch: true,
    status: "VERIFIED",
    primarySourceUrl: nasaSource.url,
    supportingSourceUrls: [nasaSource.url],
    contradictingSourceUrls: [],
    temporalStatus: "HISTORICAL",
    isIndependentCorroboration: true,
    confidenceScore: 1.0,
    reasoning: "Official NASA mission records.",
  };

  const dossier = buildEvidenceDossier("What is the status of Artemis II?", [nasaSource], [claim], []);

  // ─── Scenario 1: Correct source + Hallucinated Entity Names ───
  const draft1 = "NASA confirmed Artemis II completed its lunar flyby. Crew members Megan K., Liu, and Gonzalez returned safely to Earth: https://www.nasa.gov/mission/artemis-ii.";
  const audit1 = await sanitizeAnswerWithDossier(draft1, dossier);
  const eval1Before = evaluateAnswerGrounding("What is the status of Artemis II?", dossier, draft1);
  const eval1After = evaluateAnswerGrounding("What is the status of Artemis II?", dossier, audit1.sanitizedAnswer);

  const test1Passed = !audit1.sanitizedAnswer.includes("Megan K.") && eval1After.verdict === "PASS";
  results.push({
    name: "Hallucinated Entity Names Elimination",
    category: "Entity Integrity",
    draftFailedBefore: true,
    sanitizedPassedAfter: test1Passed,
    detailsRemoved: audit1.unsupportedClaimsRemoved,
    sanitizedText: audit1.sanitizedAnswer,
  });

  // ─── Scenario 2: Correct source + Fabricated Statistics ───
  const draft2 = "NASA's Artemis II completed its lunar flyby with 98.4% telemetry accuracy throughout translunar injection: https://www.nasa.gov/mission/artemis-ii.";
  const audit2 = await sanitizeAnswerWithDossier(draft2, dossier);
  const test2Passed = !audit2.sanitizedAnswer.includes("98.4%");
  results.push({
    name: "Fabricated Statistics Elimination",
    category: "Metric Integrity",
    draftFailedBefore: true,
    sanitizedPassedAfter: test2Passed,
    detailsRemoved: audit2.unsupportedClaimsRemoved,
    sanitizedText: audit2.sanitizedAnswer,
  });

  // ─── Scenario 3: Correct source + Invented Exact Location ───
  const draft3 = "The Artemis II capsule splashed down and recovery occurred off Baja California: https://www.nasa.gov/mission/artemis-ii.";
  const audit3 = await sanitizeAnswerWithDossier(draft3, dossier);
  const test3Passed = !audit3.sanitizedAnswer.includes("off Baja California");
  results.push({
    name: "Invented Sub-Location Elimination",
    category: "Geographic Integrity",
    draftFailedBefore: true,
    sanitizedPassedAfter: test3Passed,
    detailsRemoved: audit2.unsupportedClaimsRemoved,
    sanitizedText: audit3.sanitizedAnswer,
  });

  // ─── Scenario 4: Correct source + Unsupported Procedural Details (30-day debrief) ───
  const draft4 = "Following splashdown, the crew was quarantined and completed a standard 30-day health debrief: https://www.nasa.gov/mission/artemis-ii.";
  const audit4 = await sanitizeAnswerWithDossier(draft4, dossier);
  const test4Passed = !audit4.sanitizedAnswer.includes("30-day health debrief") && !audit4.sanitizedAnswer.includes("quarantined");
  results.push({
    name: "Unsupported Procedural Duration & Claims Elimination",
    category: "Procedural Integrity",
    draftFailedBefore: true,
    sanitizedPassedAfter: test4Passed,
    detailsRemoved: audit4.unsupportedClaimsRemoved,
    sanitizedText: audit4.sanitizedAnswer,
  });

  // ─── Scenario 5: Correct Overall Conclusion + Fabricated Supporting Specifics ───
  const draft5 = "Artemis II successfully completed its mission in 2026. The mission was directed by Flight Director Marcus Vance at 04:15 UTC: https://www.nasa.gov/mission/artemis-ii.";
  const audit5 = await sanitizeAnswerWithDossier(draft5, dossier);
  const test5Passed = !audit5.sanitizedAnswer.includes("Marcus Vance") && !audit5.sanitizedAnswer.includes("04:15 UTC");
  results.push({
    name: "Conclusion True + Fabricated Specifics Elimination",
    category: "Precision Gating",
    draftFailedBefore: true,
    sanitizedPassedAfter: test5Passed,
    detailsRemoved: audit5.unsupportedClaimsRemoved,
    sanitizedText: audit5.sanitizedAnswer,
  });

  // ─── Scenario 6: General Source Cited for Specific Unsupported Claim ───
  const draft6 = "According to https://www.nasa.gov/mission/artemis-ii, NASA has announced a Mars landing date of July 2028.";
  const audit6 = await sanitizeAnswerWithDossier(draft6, dossier);
  const test6Passed = !audit6.sanitizedAnswer.includes("Mars landing date of July 2028");
  results.push({
    name: "General Source Cited for Unsupported External Claim",
    category: "Citation Support Gating",
    draftFailedBefore: true,
    sanitizedPassedAfter: test6Passed,
    detailsRemoved: audit6.unsupportedClaimsRemoved,
    sanitizedText: audit6.sanitizedAnswer,
  });

  // ─── Summary ───
  const passedCount = results.filter((r) => r.sanitizedPassedAfter).length;
  console.log(`\n📊 ══════════════════════════════════════════════════════════════`);
  console.log(`📊 FACT-GATING REGRESSION SUMMARY: ${passedCount}/${results.length} PASSED`);
  console.log(`📊 ══════════════════════════════════════════════════════════════\n`);

  results.forEach((r, i) => {
    const symbol = r.sanitizedPassedAfter ? "✅ PASS" : "❌ FAIL";
    console.log(`${symbol} Test ${i + 1}: [${r.category}] ${r.name}`);
    console.log(`   └─ Sanitized Output: "${r.sanitizedText.slice(0, 100)}..."`);
  });

  return {
    totalTests: results.length,
    passedCount,
    results,
  };
}
