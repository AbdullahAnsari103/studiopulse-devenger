/**
 * Automated Adversarial Test Harness for Studio AI Research Agent
 * Benchmarks claim verification, citation integrity, temporal accuracy,
 * wire syndication deduplication, and contradiction detection.
 */

import { parseHtmlContent, classifySourceQuality, computeContentFingerprint, inspectUrl } from "./source-inspector";
import { getRuntimeTemporalContext, evaluateTemporalStatus, detectOutdatedFutureTense } from "./temporal-engine";
import { checkVerbatimMatch, countIndependentCorroboration } from "./verification-engine";
import { buildEvidenceDossier, formatDossierForMainAI } from "./dossier-builder";
import type { InspectedSource, VerifiedClaim, ContradictionRecord } from "./types";

export interface TestResult {
  name: string;
  category: "Citation Integrity" | "Claim Verification" | "Temporal Consistency" | "Syndication & Corroboration" | "Contradiction Engine" | "Dossier Formatting";
  passed: boolean;
  actual: any;
  expected: any;
  details: string;
}

export async function runAdversarialTestSuite(): Promise<{
  totalTests: number;
  passedCount: number;
  failedCount: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const temporalCtx = getRuntimeTemporalContext();

  console.log(`\n🧪 ══════════════════════════════════════════════════════════════`);
  console.log(`🧪 RUNNING ADVERSARIAL BENCHMARK SUITE FOR RESEARCH AGENT`);
  console.log(`🧪 Runtime Anchor: ${temporalCtx.runtimeFormatted} (Year: ${temporalCtx.runtimeYear})`);
  console.log(`🧪 ══════════════════════════════════════════════════════════════\n`);

  // ─── Test 1: Fake / Inaccessible URL Rejection ───
  const fakeUrl = "https://this-is-a-completely-fake-domain-123456789.org/article";
  const fakeInspect = await inspectUrl(fakeUrl, 2000);
  const test1Passed = fakeInspect.accessible === false && fakeInspect.httpStatus === 0;
  results.push({
    name: "Fake / Non-Existent URL Rejection",
    category: "Citation Integrity",
    passed: test1Passed,
    actual: fakeInspect.accessible,
    expected: false,
    details: "Non-existent domains must fail accessibility checks immediately.",
  });

  // ─── Test 2: Verbatim Quote Verification ───
  const sampleArticleText = "Sony officially announced the Alpha 7 V camera featuring a 44MP BSI sensor and AI autofocus.";
  const genuineQuote = "featuring a 44MP BSI sensor";
  const fabricatedQuote = "featuring an 8K 120fps global shutter sensor";

  const genuineMatch = checkVerbatimMatch(sampleArticleText, genuineQuote);
  const fabricatedMatch = checkVerbatimMatch(sampleArticleText, fabricatedQuote);
  const test2Passed = genuineMatch === true && fabricatedMatch === false;
  results.push({
    name: "Verbatim Quote Integrity & Hallucination Prevention",
    category: "Citation Integrity",
    passed: test2Passed,
    actual: { genuineMatch, fabricatedMatch },
    expected: { genuineMatch: true, fabricatedMatch: false },
    details: "Engine must confirm exact quotes exist in source and reject fabricated quotes.",
  });

  // ─── Test 3: Wire Syndication & Duplicate Corroboration Detection ───
  const wireTextA = "TechCorp today announced Q3 revenue of $14.2 billion, up 12% year over year according to PR Newswire.";
  const wireTextB = "TechCorp today announced Q3 revenue of $14.2 billion, up 12% year over year according to PR Newswire.";
  const independentTextC = "Financial analyst John Doe independently reviewed TechCorp SEC filings and verified $14.2B revenue.";

  const sourceA: InspectedSource = {
    url: "https://site-a.com/news/1",
    finalUrl: "https://site-a.com/news/1",
    domain: "site-a.com",
    title: "Wire Release A",
    text: wireTextA,
    httpStatus: 200,
    accessible: true,
    quality: "SECONDARY_REPORT",
    isPrimary: false,
    isWireOrSyndicated: true,
    wireAgency: "PR Newswire",
    contentFingerprint: computeContentFingerprint(wireTextA),
  };

  const sourceB: InspectedSource = {
    url: "https://site-b.com/news/2",
    finalUrl: "https://site-b.com/news/2",
    domain: "site-b.com",
    title: "Wire Release B",
    text: wireTextB,
    httpStatus: 200,
    accessible: true,
    quality: "SECONDARY_REPORT",
    isPrimary: false,
    isWireOrSyndicated: true,
    wireAgency: "PR Newswire",
    contentFingerprint: computeContentFingerprint(wireTextB),
  };

  const sourceC: InspectedSource = {
    url: "https://analyst-site.org/report",
    finalUrl: "https://analyst-site.org/report",
    domain: "analyst-site.org",
    title: "Independent Analysis",
    text: independentTextC,
    httpStatus: 200,
    accessible: true,
    quality: "EXPERT_ANALYSIS",
    isPrimary: true,
    isWireOrSyndicated: false,
    contentFingerprint: computeContentFingerprint(independentTextC),
  };

  const syndicationCheck = countIndependentCorroboration([sourceA, sourceB, sourceC]);
  // Fingerprints of A and B match, so distinct fingerprints = 2, despite 3 sources
  const test3Passed = syndicationCheck.isSyndicatedWire === true && sourceA.contentFingerprint === sourceB.contentFingerprint;
  results.push({
    name: "Circular Wire Syndication vs Independent Corroboration",
    category: "Syndication & Corroboration",
    passed: test3Passed,
    actual: { isSyndicated: syndicationCheck.isSyndicatedWire, fingerprintMatch: sourceA.contentFingerprint === sourceB.contentFingerprint },
    expected: { isSyndicated: true, fingerprintMatch: true },
    details: "Identical wire releases on different blogs must not be counted as independent corroboration.",
  });

  // ─── Test 4: Dynamic Runtime Date Anchoring (No Hard-Coded Dates) ───
  const test4Passed = typeof temporalCtx.runtimeYear === "number" && temporalCtx.runtimeYear >= 2024 && !isNaN(temporalCtx.runtimeDate.getTime());
  results.push({
    name: "Dynamic Runtime Date Anchoring",
    category: "Temporal Consistency",
    passed: test4Passed,
    actual: temporalCtx.runtimeFormatted,
    expected: "Valid dynamic date object derived from system clock",
    details: "Current date must never be hard-coded.",
  });

  // ─── Test 5: Outdated Future Prediction Detection ───
  const pastYear = temporalCtx.runtimeYear - 2;
  const outdatedPrediction = detectOutdatedFutureTense(
    "The mission will launch in November 2023 with four astronauts.",
    `${pastYear}-05-10`,
    temporalCtx
  );
  const test5Passed = outdatedPrediction.isOutdatedPrediction === true;
  results.push({
    name: "Outdated Future-Tense Prediction Detection",
    category: "Temporal Consistency",
    passed: test5Passed,
    actual: outdatedPrediction.isOutdatedPrediction,
    expected: true,
    details: "Old articles using future tense for dates that are now in the past must be flagged as outdated.",
  });

  // ─── Test 6: Historical Event Classification ───
  const pastEventDate = `${temporalCtx.runtimeYear - 1}-04-15`;
  const temporalEvaluation = evaluateTemporalStatus(undefined, pastEventDate, temporalCtx);
  const test6Passed = temporalEvaluation.status === "HISTORICAL";
  results.push({
    name: "Historical Event Chronology Resolution",
    category: "Temporal Consistency",
    passed: test6Passed,
    actual: temporalEvaluation.status,
    expected: "HISTORICAL",
    details: "Events with dates prior to runtime date must be classified as HISTORICAL.",
  });

  // ─── Test 7: Future Event Classification ───
  const futureEventDate = `${temporalCtx.runtimeYear + 1}-10-01`;
  const futureTemporalEval = evaluateTemporalStatus(undefined, futureEventDate, temporalCtx);
  const test7Passed = futureTemporalEval.status === "UPCOMING";
  results.push({
    name: "Upcoming Event Chronology Resolution",
    category: "Temporal Consistency",
    passed: test7Passed,
    actual: futureTemporalEval.status,
    expected: "UPCOMING",
    details: "Events scheduled after current runtime date must be classified as UPCOMING.",
  });

  // ─── Test 8: Primary Domain Hierarchy Scoring ───
  const nasaQuality = classifySourceQuality("https://www.nasa.gov/mission", "nasa.gov", false);
  const bbcQuality = classifySourceQuality("https://www.bbc.com/news", "bbc.com", false);
  const blogQuality = classifySourceQuality("https://myrandomblog.com/post", "myrandomblog.com", false);
  const secondaryQuality = classifySourceQuality("https://technewsdaily247.com/article", "technewsdaily247.com", false);

  const test8Passed =
    nasaQuality === "PRIMARY_OFFICIAL" &&
    bbcQuality === "REPUTABLE_NEWS" &&
    blogQuality === "AGGREGATOR_BLOG" &&
    secondaryQuality === "SECONDARY_REPORT";

  results.push({
    name: "Source Authority Hierarchy & Classification",
    category: "Citation Integrity",
    passed: test8Passed,
    actual: { nasaQuality, bbcQuality, blogQuality, secondaryQuality },
    expected: { nasaQuality: "PRIMARY_OFFICIAL", bbcQuality: "REPUTABLE_NEWS", blogQuality: "AGGREGATOR_BLOG", secondaryQuality: "SECONDARY_REPORT" },
    details: "Official government/organization portals must outrank reputable news, secondary reports, and aggregators/blogs.",
  });

  // ─── Test 9: Contradiction Engine Formatting ───
  const contradictionSample: ContradictionRecord = {
    topic: "Release Timeline",
    claimA: {
      statement: "Release scheduled for Q2 2026",
      sourceUrl: "https://news-site-a.com/story",
      sourceDate: "2026-01-15",
      isPrimary: false,
    },
    claimB: {
      statement: "Official release delayed to 2027",
      sourceUrl: "https://official-studio.com/press",
      sourceDate: "2026-06-20",
      isPrimary: true,
    },
    resolution: "SOURCE_B_NEWER",
    reasoning: "Official primary source dated June 2026 supersedes January 2026 preview.",
  };

  const sampleClaim: VerifiedClaim = {
    id: "claim-1",
    claim: "Studio AI introduces claim verification",
    evidenceText: "Studio AI introduces claim verification in 2026",
    exactQuoteMatch: true,
    status: "VERIFIED",
    primarySourceUrl: "https://official-studio.com/press",
    supportingSourceUrls: ["https://official-studio.com/press"],
    contradictingSourceUrls: [],
    temporalStatus: "CURRENT",
    isIndependentCorroboration: true,
    confidenceScore: 0.95,
    reasoning: "Confirmed in official documentation.",
  };

  const dossier = buildEvidenceDossier(
    "Test Query",
    [sourceC],
    [sampleClaim],
    [contradictionSample]
  );

  const formattedPrompt = formatDossierForMainAI(dossier);
  const test9Passed = formattedPrompt.includes("VERIFIED EVIDENCE DOSSIER") && formattedPrompt.includes("CONFLICTS & CONTRADICTIONS DETECTED");
  results.push({
    name: "Structured Evidence Dossier & Contradiction Preservation",
    category: "Dossier Formatting",
    passed: test9Passed,
    actual: test9Passed,
    expected: true,
    details: "Evidence dossier must structure verified claims, contradictions, and explicit citation rules.",
  });

  // ─── Test 10: HTML Metadata & JSON-LD Date Extraction ───
  const mockHtml = `
    <html>
      <head>
        <title>NASA Artemis Update</title>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"NewsArticle","headline":"Artemis Launch Date","datePublished":"2026-04-10T12:00:00Z"}
        </script>
      </head>
      <body>
        <main><p>NASA confirmed the target date is set.</p></main>
      </body>
    </html>
  `;
  const parsedMock = parseHtmlContent(mockHtml);
  const test10Passed = parsedMock.extractedDate === "2026-04-10" && parsedMock.dateSource === "json-ld";
  results.push({
    name: "JSON-LD & OpenGraph Date Extraction",
    category: "Temporal Consistency",
    passed: test10Passed,
    actual: { date: parsedMock.extractedDate, source: parsedMock.dateSource },
    expected: { date: "2026-04-10", source: "json-ld" },
    details: "Structured schema.org JSON-LD dates must be accurately parsed.",
  });

  // ─── Test 11: Correct Conclusion with Fabricated Evidence Detection ───
  // A claim whose conclusion happens to be true, but the provided citation excerpt does not contain the fact.
  const trueConclusion = "Python 3.12 was released in October 2023.";
  const unrelatedSourceText = "Python is a versatile programming language created by Guido van Rossum with extensive library ecosystems.";
  const supportedInSource = checkVerbatimMatch(unrelatedSourceText, "October 2023");
  const test11Passed = supportedInSource === false;
  results.push({
    name: "Correct Conclusion with Fabricated/Unrelated Citation Detection",
    category: "Claim Verification",
    passed: test11Passed,
    actual: supportedInSource,
    expected: false,
    details: "Even if a conclusion is factually true in the world, the citation must be rejected if the inspected text does not contain the supporting evidence.",
  });

  // ─── Test 12: Stale High-Ranking Search Result vs Current Reality ───
  // Stale article from 2024 stating "Next solar eclipse will occur on April 8, 2024"
  const staleSearchResult = detectOutdatedFutureTense(
    "The next major total solar eclipse will occur across North America on April 8, 2024.",
    "2024-01-10",
    temporalCtx
  );
  const test12Passed = staleSearchResult.isOutdatedPrediction === true;
  results.push({
    name: "Stale Search Results vs Current Temporal State",
    category: "Temporal Consistency",
    passed: test12Passed,
    actual: staleSearchResult.isOutdatedPrediction,
    expected: true,
    details: "High-ranking search results with outdated future-tense predictions must be classified as outdated relative to current runtime year.",
  });

  // ─── Summary Calculation ───
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log(`\n📊 ══════════════════════════════════════════════════════════════`);
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount}/${results.length} PASSED (${failedCount} FAILED)`);
  console.log(`📊 ══════════════════════════════════════════════════════════════\n`);

  results.forEach((r, i) => {
    const symbol = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${symbol} [${r.category}] Test ${i + 1}: ${r.name}`);
    if (!r.passed) {
      console.log(`   └─ Details: ${r.details}`);
      console.log(`   └─ Expected: ${JSON.stringify(r.expected)} | Actual: ${JSON.stringify(r.actual)}`);
    }
  });

  return {
    totalTests: results.length,
    passedCount,
    failedCount,
    results,
  };
}
