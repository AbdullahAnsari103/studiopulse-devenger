import { runEndToEndBenchmarks } from "./e2e-benchmarks";

async function main() {
  const summary = await runEndToEndBenchmarks();
  if (summary.failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("E2E Benchmark runner threw error:", err);
  process.exit(1);
});
