#!/usr/bin/env bun
/**
 * Fast local gate matching the CI `test` job (.github/workflows/ci.yml):
 * lint, typecheck, unit tests, and install.sh syntax check.
 */
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");

async function runStep(label: string, cmd: string[]): Promise<void> {
  console.log(`\n==> ${label}`);
  const proc = Bun.spawn(cmd, {
    cwd: repoRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`\npre-commit check failed: ${label}`);
    process.exit(code);
  }
}

await runStep("lint", ["bun", "run", "lint"]);
await runStep("typecheck", ["bun", "run", "typecheck"]);
await runStep("unit tests", ["bun", "run", "test:unit"]);
await runStep("action.yml marketplace", ["bun", "run", "validate:action"]);
await runStep("install.sh syntax", ["bash", "-n", "install.sh"]);

console.log("\nAll pre-commit checks passed (CI test job).");
