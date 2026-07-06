#!/usr/bin/env bun
/**
 * Idempotent: point this repo at .githooks/ and ensure pre-commit is executable.
 */
import { chmod } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");
const preCommit = path.join(repoRoot, ".githooks", "pre-commit");

await chmod(preCommit, 0o755);

const proc = Bun.spawn(["git", "config", "core.hooksPath", ".githooks"], {
  cwd: repoRoot,
  stdout: "inherit",
  stderr: "inherit",
});
const code = await proc.exited;
if (code !== 0) process.exit(code);

console.log("Git hooks enabled: .githooks/pre-commit runs bun run ci:check before each commit.");
