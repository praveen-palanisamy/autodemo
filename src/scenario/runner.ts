import path from "node:path";

import type { AutoDemoConfig, ScenarioStep } from "../config/schema.ts";
import {
  createPlaywrightSession,
  createPlaywrightSessionFromCdp,
  closePlaywrightSession,
} from "../engines/playwright/session.ts";
import { executePlaywrightStep } from "../engines/playwright/execute.ts";
import { createStagehandSession, closeStagehandSession } from "../engines/stagehand/session.ts";
import { executeStagehandStep } from "../engines/stagehand/execute.ts";
import type { RunJson, RunJsonStep, RunStatus } from "../output/types.ts";
import { scenarioLatestDir, stepScreenshotPath, stepsDir } from "../output/paths.ts";
import { writeInteractiveHtml, writeRunJson } from "../output/writeArtifacts.ts";
import { convertWebmToMp4, isFfmpegAvailable } from "../output/video.ts";
import { ensureDir, rmrf } from "../utils/fs.ts";
import { installCursorOverlay } from "../utils/cursorOverlay.ts";
import { appendFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

export type RunScenarioOpts = {
  config: AutoDemoConfig;
  scenarioName: string;
  baseUrl: string;
  outputDirBase: string;
  headless?: boolean;
  debug?: boolean;
};

export type ScenarioArtifacts = {
  interactiveHtml: string;
  runJson: string;
  videoMp4?: string;
  traceZip?: string;
  ffmpegLogPath?: string;
};

export type RunScenarioResult = {
  status: RunStatus;
  outDir: string;
  artifacts: ScenarioArtifacts;
  run: RunJson;
  failureMessage?: string;
};

export async function runScenario(opts: RunScenarioOpts): Promise<RunScenarioResult> {
  const scenario = opts.config.scenarios[opts.scenarioName];
  if (!scenario) {
    throw new Error(`Scenario not found: ${opts.scenarioName}`);
  }

  const outDir = scenarioLatestDir(opts.outputDirBase, opts.scenarioName);
  if (opts.config.output.clean) {
    await rmrf(outDir);
  }
  await ensureDir(outDir);
  await ensureDir(stepsDir(outDir));

  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  const needsStagehand = scenario.steps.some((s) => s.type === "act");
  const stagehandApiKey =
    opts.config.stagehand?.mode === "browserbase"
      ? process.env[opts.config.stagehand.browserbaseApiKeyEnv]
      : undefined;

  const headless = opts.headless ?? opts.config.browser.headless;

  const stagehandSession = needsStagehand
    ? await createStagehandSession({
        env: opts.config.stagehand?.mode === "browserbase" ? "BROWSERBASE" : "LOCAL",
        browserbaseApiKey: stagehandApiKey,
        headless,
        viewport: opts.config.browser.viewport,
        modelName: opts.config.llm?.model,
        llmProvider: opts.config.llm?.provider,
        llmApiKey: opts.config.llm?.apiKeyEnv ? process.env[opts.config.llm.apiKeyEnv] : undefined,
      })
    : undefined;

  const session = stagehandSession
    ? await createPlaywrightSessionFromCdp({
        cdpUrl: stagehandSession.cdpUrl,
        viewport: opts.config.browser.viewport,
        enableTracing: true,
      })
    : await createPlaywrightSession({
        outDir,
        headless,
        viewport: opts.config.browser.viewport,
        recordVideo: opts.config.browser.recordVideo,
        enableTracing: true, // needed to export trace on failure
      });

  // Ensure cursor is visible in videos/screenshots and highlight clicks.
  const cursorOpts = opts.config.browser.cursor ?? {
    showCursor: true,
    style: "arrow",
    highlightClicks: true,
    clickRadius: 24,
  };
  try {
    await installCursorOverlay(session.page, {
      showCursor: cursorOpts.showCursor ?? true,
      style: (cursorOpts.style as "arrow" | "hand") ?? "arrow",
      highlightClicks: cursorOpts.highlightClicks ?? true,
      clickRadius: cursorOpts.clickRadius ?? 24,
    });
  } catch {
    // best-effort; ignore overlay failures
  }

  const steps: RunJsonStep[] = [];
  let status: RunStatus = "success";
  let traceZipPathRel: string | undefined;
  const transitionMs = opts.config.browser.transitions?.transitionMs ?? 800;
  const endPauseMs = opts.config.browser.transitions?.endPauseMs ?? 1200;
  const logsDir = path.join(process.cwd(), "logs");
  await mkdir(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `${Date.now()}_${opts.scenarioName}.log`);

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i] as ScenarioStep;
    const stepStartedMs = Date.now();
    const stepStartedAt = new Date(stepStartedMs).toISOString();

    try {
      if (step.type === "act") {
        if (!stagehandSession) throw new Error("Stagehand session not initialized");
        await executeStagehandStep({ stagehand: stagehandSession.stagehand, page: session.page, step });
      } else {
        await executePlaywrightStep({ page: session.page, baseUrl: opts.baseUrl, step });
      }

      const screenshot = step.capture === false ? undefined : stepScreenshotPath(outDir, i);
      if (screenshot) {
        await session.page.screenshot({ path: screenshot.abs, fullPage: true });
      }

      const selector =
        step.type === "click" ||
        step.type === "fill" ||
        step.type === "hover" ||
        step.type === "select" ||
        step.type === "waitForSelector" ||
        step.type === "expectVisible" ||
        step.type === "expectText"
          ? step.selector
          : step.type === "press"
            ? step.selector
            : undefined;

      if (transitionMs > 0) {
        await session.page.waitForTimeout(transitionMs);
      }

      const stepFinishedMs = Date.now();
      const stepFinishedAt = new Date(stepFinishedMs).toISOString();
      steps.push({
        index: i,
        type: step.type,
        startedAt: stepStartedAt,
        finishedAt: stepFinishedAt,
        offsetMs: stepStartedMs - startedAtMs,
        durationMs: stepFinishedMs - stepStartedMs,
        status: "success",
        screenshotPath: screenshot?.rel,
        note: step.note,
        ...(step.type === "goto" ? { url: step.url } : {}),
        ...(step.type === "act" ? { instruction: step.instruction } : {}),
        ...(selector ? { selector } : {}),
        ...(step.type === "waitFor" ? { text: step.text } : {}),
        ...(step.type === "expectText" ? { text: step.text } : {}),
      });
    } catch (err) {
      status = "failure";
      const message = err instanceof Error ? err.message : String(err);
      await appendFile(logPath, `[${new Date().toISOString()}] ERROR ${message}\n`);

      // Best-effort screenshot on failure (if capture isn't explicitly disabled).
      const screenshot = step.capture === false ? undefined : stepScreenshotPath(outDir, i);
      if (screenshot) {
        try {
          await session.page.screenshot({ path: screenshot.abs, fullPage: true });
        } catch {
          // ignore
        }
      }

      // Export trace.zip for debugging.
      try {
        const traceAbs = path.join(outDir, "trace.zip");
        await session.context.tracing.stop({ path: traceAbs });
        traceZipPathRel = "trace.zip";
      } catch {
        // ignore
      }

      const stepFinishedMs = Date.now();
      steps.push({
        index: i,
        type: step.type,
        startedAt: stepStartedAt,
        finishedAt: new Date(stepFinishedMs).toISOString(),
        offsetMs: stepStartedMs - startedAtMs,
        durationMs: stepFinishedMs - stepStartedMs,
        status: "failure",
        screenshotPath: screenshot?.rel,
        note: step.note,
        error: { message: err instanceof Error ? err.message : String(err) },
      });

      break;
    }
  }

  // Save trace even on success when debug is enabled.
  if (status === "success" && opts.debug) {
    try {
      const traceAbs = path.join(outDir, "trace.zip");
      await session.context.tracing.stop({ path: traceAbs });
      traceZipPathRel = "trace.zip";
    } catch {
      // ignore
    }
  }

  if (!traceZipPathRel) {
    // Stop tracing without saving to keep output small.
    try {
      await session.context.tracing.stop();
    } catch {
      // ignore
    }
  }

  if (endPauseMs > 0) {
    try {
      await session.page.waitForTimeout(endPauseMs);
    } catch {
      // ignore
    }
  }

  const { videoWebmPath } = await closePlaywrightSession(session).catch(() => ({ videoWebmPath: undefined }));

  if (stagehandSession) {
    await closeStagehandSession(stagehandSession).catch(() => {});
  }
  let videoMp4PathRel: string | undefined;
  if (videoWebmPath) {
    // Keep artifact stable by copying/renaming to outDir even if Playwright stores elsewhere.
    try {
      const webmAbs = path.join(outDir, "video.webm");
      await Bun.write(webmAbs, Bun.file(videoWebmPath));

      if (await isFfmpegAvailable()) {
        const mp4Abs = path.join(outDir, "video.mp4");
        await convertWebmToMp4({ inputWebm: webmAbs, outputMp4: mp4Abs, logPath });
        videoMp4PathRel = "video.mp4";
      }
    } catch {
      // ignore
    }
  }

  const interactiveHtmlAbs = await writeInteractiveHtml(outDir);
  const finishedAtMs = Date.now();
  const finishedAt = new Date(finishedAtMs).toISOString();

  const runJson: RunJson = {
    project: { name: opts.config.project.name, baseUrl: opts.baseUrl },
    scenario: { name: opts.scenarioName, description: scenario.description },
    startedAt,
    finishedAt,
    durationMs: finishedAtMs - startedAtMs,
    status,
    steps,
    artifacts: {
      interactiveHtmlPath: "index.html",
      runJsonPath: "run.json",
      ffmpegLogPath: path.relative(process.cwd(), logPath),
      ...(videoMp4PathRel ? { videoMp4Path: videoMp4PathRel } : {}),
      ...(traceZipPathRel ? { traceZipPath: traceZipPathRel } : {}),
    },
  };

  const runJsonAbs = await writeRunJson(outDir, runJson);

  return {
    status,
    outDir,
    artifacts: {
      interactiveHtml: interactiveHtmlAbs,
      runJson: runJsonAbs,
      ...(videoMp4PathRel ? { videoMp4: path.join(outDir, videoMp4PathRel) } : {}),
      ...(traceZipPathRel ? { traceZip: path.join(outDir, traceZipPathRel) } : {}),
      ffmpegLogPath: logPath,
    },
    run: runJson,
    failureMessage: status === "failure" ? "Scenario failed – see run.json and logs for details." : undefined,
  };
}


