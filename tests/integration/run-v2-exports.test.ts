import { test, expect } from "bun:test";
import path from "node:path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { startNextFixture } from "./helpers/nextFixture.ts";
import { isFfmpegAvailable } from "../../src/output/video.ts";

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

// Minimal valid 2x2 blue PNG for the logo overlay input.
const LOGO_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGNgYPj/n4GBgQEACfsD/Uz2iT8AAAAASUVORK5CYII=";

test(
  "autodemo run emits GIF, aspect variants, captions, and brand cards from one run",
  async () => {
    if (!(await isFfmpegAvailable())) {
      console.warn("ffmpeg not available; skipping v2 export integration test");
      return;
    }

    const { baseUrl, proc } = await startNextFixture();

    try {
      const tmpRoot = path.join(process.cwd(), ".autodemo-out", "integration", `v2-${Date.now()}`);
      const outDirBase = path.join(tmpRoot, "demos");
      await mkdir(tmpRoot, { recursive: true });

      const logoPath = path.join(tmpRoot, "logo.png");
      await writeFile(logoPath, Buffer.from(LOGO_PNG_BASE64, "base64"));

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
  formats: [mp4, gif]
  aspectRatios: ["1:1", "9:16"]
  captions:
    enabled: true
    burnIn: false
  brand:
    logoPath: ${logoPath}
    logoPosition: bottom-right
    logoWidthPx: 32
    introCard: true
    outroCard: true
    outroText: "Try FixtureApp today"
    cardDurationMs: 600

browser:
  headless: true
  viewport: { width: 640, height: 360 }
  recordVideo: true
  transitions:
    transitionMs: 200
    endPauseMs: 200

scenarios:
  signup:
    description: "Signup flow"
    story:
      title: "Sign up in seconds"
      persona: "New user"
      goal: "Create an account and land on the dashboard"
    steps:
      - type: goto
        url: /signup
        note: "Open the signup page"
      - type: fill
        selector: "[data-testid=email]"
        value: "demo@example.com"
        note: "Enter your email"
      - type: fill
        selector: "[data-testid=password]"
        value: "password"
      - type: click
        selector: "[data-testid=signup-button]"
        note: "Create the account"
      - type: waitFor
        text: "Dashboard"
        note: "You land on the dashboard"
`,
        "utf8",
      );

      const { exitCode, stdout, stderr } = await runCli([
        "run",
        "signup",
        "--config",
        cfgPath,
        "--no-tui",
        "--json",
      ]);

      expect(exitCode, stderr).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.status).toBe("success");

      const scenarioOutDir = parsed.results[0].outDir as string;
      const runJson = JSON.parse(await readFile(path.join(scenarioOutDir, "run.json"), "utf8"));
      expect(runJson.status).toBe("success");

      // Master video + derived exports
      expect(runJson.artifacts.videoMp4Path).toBe("video.mp4");
      expect(runJson.artifacts.videoGifPath).toBe("video.gif");
      expect(runJson.artifacts.videoVariants).toEqual([
        { aspect: "1x1", mp4Path: "video-1x1.mp4", gifPath: "video-1x1.gif" },
        { aspect: "9x16", mp4Path: "video-9x16.mp4", gifPath: "video-9x16.gif" },
      ]);
      expect(runJson.artifacts.captionsSrtPath).toBe("captions.srt");
      expect(runJson.artifacts.captionsVttPath).toBe("captions.vtt");

      for (const rel of [
        "video.mp4",
        "video.gif",
        "video-1x1.mp4",
        "video-9x16.mp4",
        "video-1x1.gif",
        "video-9x16.gif",
        "captions.srt",
        "captions.vtt",
        path.join("frames", "intro.png"),
        path.join("frames", "outro.png"),
      ]) {
        await access(path.join(scenarioOutDir, rel));
      }

      // Captions shifted past the intro card and containing the step notes
      const srt = await readFile(path.join(scenarioOutDir, "captions.srt"), "utf8");
      expect(srt).toContain("Open the signup page");
      expect(srt).toContain("You land on the dashboard");
      expect(srt.startsWith("1\n00:00:00,600 -->")).toBe(true);

      const vtt = await readFile(path.join(scenarioOutDir, "captions.vtt"), "utf8");
      expect(vtt.startsWith("WEBVTT\n")).toBe(true);
    } finally {
      proc.kill();
    }
  },
  240_000,
);
