import { runAdversarialTestSuite } from "./test-runner";

async function main() {
  const summary = await runAdversarialTestSuite();
  if (summary.failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});
