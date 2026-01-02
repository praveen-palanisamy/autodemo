import { test, expect } from "bun:test";
import path from "node:path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { startNextFixture } from "./helpers/nextFixture.ts";

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["bun", "run", "./bin/autodemo.ts", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();
  const exitCode = await child.exited;
  return { exitCode, stdout, stderr };
}

test(
  "autodemo run executes a Playwright-only scenario against the Next.js fixture app",
  async () => {
    const { baseUrl, proc } = await startNextFixture();

    try {
      const tmpRoot = path.join(process.cwd(), ".autodemo-out", "integration", String(Date.now()));
      const outDirBase = path.join(tmpRoot, "demos");
      await mkdir(tmpRoot, { recursive: true });

      const cfgPath = path.join(tmpRoot, ".autodemo.yml");
      await writeFile(
        cfgPath,
        `
project:
  name: FixtureApp
  baseUrl: ${baseUrl}

output:
  dir: ${outDirBase}
  clean: true

browser:
  headless: true
  viewport: { width: 1280, height: 720 }
  recordVideo: false

scenarios:
  signup:
    description: "Signup flow"
    steps:
      - type: goto
        url: /signup
      - type: fill
        selector: "[data-testid=email]"
        value: "demo@example.com"
      - type: fill
        selector: "[data-testid=password]"
        value: "password"
      - type: click
        selector: "[data-testid=signup-button]"
      - type: waitFor
        text: "Dashboard"
`,
        "utf8",
      );

      const { exitCode, stdout } = await runCli([
        "run",
        "signup",
        "--config",
        cfgPath,
        "--no-tui",
        "--json",
      ]);

      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.status).toBe("success");

      const scenarioOutDir = parsed.results[0].outDir as string;
      const runJson = JSON.parse(await readFile(path.join(scenarioOutDir, "run.json"), "utf8"));
      expect(runJson.status).toBe("success");
      expect(runJson.steps.length).toBe(5);

      // Sanity: first screenshot exists
      const firstShot = path.join(scenarioOutDir, "steps", "0001.png");
      await access(firstShot);
    } finally {
      proc.kill();
    }
  },
  180_000,
);


