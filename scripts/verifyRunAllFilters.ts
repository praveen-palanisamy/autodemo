#!/usr/bin/env bun
/**
 * Manual verification for `run --all` internal/--exclude filtering.
 * Idempotent: uses a timestamped .autodemo-out subdir and exits non-zero on failure.
 */
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { startNextFixture } from "../tests/integration/helpers/nextFixture.ts";

type RunJson = {
  status: string;
  results: { scenario: string; status: string }[];
};

async function runCli(args: string[]): Promise<RunJson> {
  const child = Bun.spawn(["bun", "run", "./bin/autodemo.ts", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`autodemo ${args.join(" ")} failed (exit ${exitCode})\n${stderr}\n${stdout}`);
  }
  return JSON.parse(stdout) as RunJson;
}

function scenarioNames(result: RunJson): string[] {
  return result.results.map((r) => r.scenario);
}

function assertNames(label: string, actual: string[], expected: string[]): void {
  const a = [...actual].sort();
  const e = [...expected].sort();
  if (a.join(",") !== e.join(",")) {
    throw new Error(`${label}: expected [${e.join(", ")}], got [${a.join(", ")}]`);
  }
  console.log(`✓ ${label}: [${actual.join(", ")}]`);
}

const { baseUrl, proc } = await startNextFixture();
try {
  const tmpRoot = path.join(process.cwd(), ".autodemo-out", "verify-run-filters", String(Date.now()));
  const outDirBase = path.join(tmpRoot, "demos");
  await mkdir(tmpRoot, { recursive: true });

  const cfgPath = path.join(tmpRoot, ".autodemo.yml");
  await writeFile(
    cfgPath,
    `
project:
  name: FilterVerify
  baseUrl: ${baseUrl}

output:
  dir: ${outDirBase}
  clean: true

browser:
  headless: true
  viewport: { width: 1280, height: 720 }
  recordVideo: false

scenarios:
  foo:
    steps:
      - type: goto
        url: /
      - type: waitFor
        text: "AutoDemo Fixture"
  bar:
    steps:
      - type: goto
        url: /signup
      - type: waitFor
        text: "Sign up"
  baz:
    steps:
      - type: goto
        url: /
      - type: waitFor
        text: "AutoDemo Fixture"
  login-bootstrap:
    internal: true
    steps:
      - type: goto
        url: /
      - type: waitFor
        text: "AutoDemo Fixture"
`,
    "utf8",
  );

  const common = ["--config", cfgPath, "--no-tui", "--json", "--headless"];

  const allResult = await runCli(["run", "--all", ...common]);
  assertNames("`run --all` skips internal scenarios", scenarioNames(allResult), ["foo", "bar", "baz"]);

  const internalResult = await runCli(["run", "login-bootstrap", ...common]);
  assertNames("`run <internal-name>` still runs internal scenario", scenarioNames(internalResult), [
    "login-bootstrap",
  ]);

  const excludeResult = await runCli(["run", "--all", "--exclude", "foo,bar", ...common]);
  assertNames("`run --all --exclude foo,bar` omits listed scenarios", scenarioNames(excludeResult), [
    "baz",
  ]);

  const partialExclude = await runCli(["run", "--all", "--exclude", "bar,baz", ...common]);
  assertNames("`run --all --exclude bar,baz` omits only those names", scenarioNames(partialExclude), [
    "foo",
  ]);

  console.log("\nAll run filter checks passed.");
} finally {
  proc.kill();
}
