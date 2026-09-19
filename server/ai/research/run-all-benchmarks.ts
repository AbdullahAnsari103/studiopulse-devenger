/**
 * Master Verification & Benchmark Harness
 * Runs:
 * 1. 12 Adversarial Unit Benchmarks
 * 2. 8 End-to-End Pipeline Benchmarks
 * 3. 6 Fact-Gating Unsupported-Detail Regression Benchmarks
 */

import { runAdversarialTestSuite } from "./test-runner";
import { runEndToEndBenchmarks } from "./e2e-benchmarks";
import { runUnsupportedDetailsRegressionTests } from "./unsupported-details.test";

async function runAll() {
  console.log(`\n🚀 ══════════════════════════════════════════════════════════════`);
  console.log(`🚀 RUNNING FULL STUDIO AI VERIFICATION & BENCHMARK SUITE`);
  console.log(`🚀 ══════════════════════════════════════════════════════════════\n`);

  // Suite 1
  const s1 = await runAdversarialTestSuite();

  // Suite 2
  const s2 = await runEndToEndBenchmarks();

  // Suite 3
  const s3 = await runUnsupportedDetailsRegressionTests();

  const total = s1.totalTests + s2.totalCases + s3.totalTests;
  const passed = s1.passedCount + s2.passedCount + s3.passedCount;
  const failed = total - passed;

  console.log(`\n🏆 ══════════════════════════════════════════════════════════════`);
  console.log(`🏆 ALL SUITES COMPLETED: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log(`🏆 ══════════════════════════════════════════════════════════════\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error("Benchmark runner encountered fatal error:", err);
  process.exit(1);
});
