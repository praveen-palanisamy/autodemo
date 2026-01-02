import path from "node:path";

import type { AutoDemoConfig, ScenarioStep } from "../config/schema.ts";
import { createPlaywrightSession, closePlaywrightSession } from "../engines/playwright/session.ts";
import { executePlaywrightStep } from "../engines/playwright/execute.ts";
import { createStagehandSession, closeStagehandSession } from "../engines/stagehand/session.ts";
import { executeStagehandStep } from "../engines/stagehand/execute.ts";
import type { RunJson, RunJsonStep, RunStatus } from "../output/types.ts";
import { scenarioLatestDir, stepScreenshotPath, stepsDir } from "../output/paths.ts";
import { writeInteractiveHtml, writeRunJson } from "../output/writeArtifacts.ts";
import { convertWebmToMp4, isFfmpegAvailable } from "../output/video.ts";
import { ensureDir, rmrf } from "../utils/fs.ts";

export type RunScenarioOpts = {
  config: AutoDemoConfig;
  scenarioName: string;
  baseUrl: string;
  outputDirBase: string;
  headless?: boolean;
  debug?: boolean;
};

export type RunScenarioResult = {
  status: RunStatus;
  outDir: string;
  artifacts: { interactiveHtml: string; runJson: string; videoMp4?: string; traceZip?: string };
  run: RunJson;
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

  const startedAt = new Date().toISOString();

  const session = await createPlaywrightSession({
    outDir,
    headless: opts.headless ?? opts.config.browser.headless,
    viewport: opts.config.browser.viewport,
    recordVideo: opts.config.browser.recordVideo,
    enableTracing: true, // needed to export trace on failure
  });

  const needsStagehand = scenario.steps.some((s) => s.type === "act");
  const stagehandApiKey =
    opts.config.stagehand?.mode === "browserbase"
      ? process.env[opts.config.stagehand.browserbaseApiKeyEnv]
      : undefined;

  const stagehandSession = needsStagehand
    ? await createStagehandSession({
        page: session.page,
        browserbaseApiKey: stagehandApiKey,
        env: opts.config.stagehand?.mode === "browserbase" ? "BROWSERBASE" : "LOCAL",
        modelName: opts.config.llm?.model,
      })
    : undefined;

  const steps: RunJsonStep[] = [];
  let status: RunStatus = "success";
  let traceZipPathRel: string | undefined;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i] as ScenarioStep;
    const stepStartedAt = new Date().toISOString();

    try {
      if (step.type === "act") {
        if (!stagehandSession) throw new Error("Stagehand session not initialized");
        await executeStagehandStep({ stagehand: stagehandSession.stagehand, step });
      } else {
        await executePlaywrightStep({ page: session.page, baseUrl: opts.baseUrl, step });
      }

      const screenshot = step.capture === false ? undefined : stepScreenshotPath(outDir, i);
      if (screenshot) {
        await session.page.screenshot({ path: screenshot.abs, fullPage: true });
      }

      steps.push({
        index: i,
        type: step.type,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        status: "success",
        screenshotPath: screenshot?.rel,
        note: step.note,
        ...(step.type === "goto" ? { url: step.url } : {}),
        ...(step.type === "act" ? { instruction: step.instruction } : {}),
        // selector/text are optional; keep minimal for now
        ...(step.type === "click" || step.type === "fill" || step.type === "hover"
          ? { selector: (step as any).selector }
          : {}),
        ...(step.type === "waitFor" ? { text: step.text } : {}),
      });
    } catch (err) {
      status = "failure";

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

      steps.push({
        index: i,
        type: step.type,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
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

  if (stagehandSession) {
    await closeStagehandSession(stagehandSession);
  }

  const { videoWebmPath } = await closePlaywrightSession(session);
  let videoMp4PathRel: string | undefined;
  if (videoWebmPath) {
    // Keep artifact stable by copying/renaming to outDir even if Playwright stores elsewhere.
    try {
      const webmAbs = path.join(outDir, "video.webm");
      await Bun.write(webmAbs, Bun.file(videoWebmPath));

      if (await isFfmpegAvailable()) {
        const mp4Abs = path.join(outDir, "video.mp4");
        await convertWebmToMp4({ inputWebm: webmAbs, outputMp4: mp4Abs });
        videoMp4PathRel = "video.mp4";
      }
    } catch {
      // ignore
    }
  }

  const interactiveHtmlAbs = await writeInteractiveHtml(outDir);
  const finishedAt = new Date().toISOString();

  const runJson: RunJson = {
    project: { name: opts.config.project.name, baseUrl: opts.baseUrl },
    scenario: { name: opts.scenarioName, description: scenario.description },
    startedAt,
    finishedAt,
    status,
    steps,
    artifacts: {
      interactiveHtmlPath: "index.html",
      runJsonPath: "run.json",
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
    },
    run: runJson,
  };
}


