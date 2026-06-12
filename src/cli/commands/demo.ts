import path from "node:path";
import { existsSync } from "node:fs";

import type { ParsedCli } from "../parse.ts";
import { popFlag, popOption } from "../argUtils.ts";
import { CliUsageError } from "../errors.ts";
import { loadConfig } from "../../config/loadConfig.ts";
import { defaultConfig } from "../../config/defaultConfig.ts";
import { AutoDemoConfigSchema, type AutoDemoConfig } from "../../config/schema.ts";
import { resolveLlm, type LlmProvider } from "../../config/llm.ts";
import { normalizeRecordingUrl } from "../../recording/normalizeUrl.ts";
import { recordCore } from "../logic/recordCore.ts";
import { runScenario } from "../../scenario/runner.ts";

/**
 * `autodemo demo "<instruction>" --url <url>` — the one-shot path:
 * instruction → AI scenario → run → video + interactive walkthrough, no config required.
 */
export async function runDemo(parsed: ParsedCli): Promise<number> {
  const argv = [...parsed.args];

  const url = popOption(argv, "--url");
  const name = popOption(argv, "--name") ?? "demo";
  const provider = popOption(argv, "--provider") as LlmProvider | undefined;
  const model = popOption(argv, "--model");
  const outDirOverride = popOption(argv, "--outDir");
  const headless = popFlag(argv, "--headless");
  const noVideo = popFlag(argv, "--no-video");
  const save = popFlag(argv, "--save");
  const instructionOpt = popOption(argv, "--instruction");
  const instruction = instructionOpt ?? argv.find((a) => !a.startsWith("--"));

  if (!instruction) {
    throw new CliUsageError(
      'Missing instruction. Usage: autodemo demo "Sign up and open the dashboard" --url http://localhost:3000',
    );
  }

  // Use the repo config when present so branding/cursor/auth preferences apply;
  // otherwise build an ephemeral config so `demo` works in any directory.
  const configPathAbs = path.isAbsolute(parsed.global.configPath ?? "")
    ? (parsed.global.configPath as string)
    : path.join(parsed.global.cwd, parsed.global.configPath ?? ".autodemo.yml");
  const hasConfigFile = existsSync(configPathAbs);

  let config: AutoDemoConfig;
  if (hasConfigFile) {
    config = (await loadConfig({ cwd: parsed.global.cwd, configPath: configPathAbs })).config;
  } else {
    const base = defaultConfig();
    (base.project as Record<string, unknown>).name = path.basename(parsed.global.cwd) || "Demo";
    (base.output as Record<string, unknown>).dir = ".autodemo-out";
    config = AutoDemoConfigSchema.parse(base);
  }

  const baseUrl = url ?? config.project.baseUrl;
  if (!baseUrl) {
    throw new CliUsageError("Missing --url (or project.baseUrl in .autodemo.yml).");
  }

  // Fail fast with actionable guidance when no LLM is available for the act step.
  const llmOverrides = { ...(provider ? { provider } : {}), ...(model ? { model } : {}) };
  const llm = resolveLlm({ config: config.llm, overrides: llmOverrides });
  if (!llm) {
    throw new CliUsageError(
      [
        "No LLM available for AI-driven demos.",
        "Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY, or OLLAMA_HOST (local).",
        'Or pin one: autodemo demo "..." --provider ollama --model llama3.3',
      ].join("\n"),
    );
  }
  config = { ...config, llm: { ...config.llm, ...llmOverrides } };

  const normalized = normalizeRecordingUrl(baseUrl);
  config = {
    ...config,
    browser: { ...config.browser, recordVideo: !noVideo },
    scenarios: {
      ...config.scenarios,
      [name]: {
        description: `Generated: ${instruction}`,
        steps: [
          { type: "goto", url: normalized.pathAndQuery },
          { type: "act", instruction },
        ],
      },
    },
  };

  if (save) {
    await recordCore({
      cwd: parsed.global.cwd,
      url: baseUrl,
      instruction,
      name,
      configPath: configPathAbs,
    });
  }

  const outputDirBase = outDirOverride
    ? path.isAbsolute(outDirOverride)
      ? outDirOverride
      : path.join(parsed.global.cwd, outDirOverride)
    : path.isAbsolute(config.output.dir)
      ? config.output.dir
      : path.join(parsed.global.cwd, config.output.dir);

  if (!parsed.global.json) {
    console.log(`Generating demo "${name}" with ${llm.provider} (${llm.model}) ...`);
  }

  const result = await runScenario({
    config,
    scenarioName: name,
    baseUrl: normalized.origin,
    outputDirBase,
    headless: headless ? true : undefined,
  });

  if (parsed.global.json) {
    console.log(
      JSON.stringify(
        {
          status: result.status,
          scenario: name,
          outDir: result.outDir,
          artifacts: result.artifacts,
          ...(result.failureMessage ? { failureMessage: result.failureMessage } : {}),
          ...(save ? { savedTo: configPathAbs } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`${result.status.padEnd(7)} ${name} → ${result.outDir}`);
    console.log(`  walkthrough: ${result.artifacts.interactiveHtml}`);
    if (result.artifacts.videoMp4) console.log(`  video:       ${result.artifacts.videoMp4}`);
    if (save) console.log(`  scenario saved to ${configPathAbs}`);
    if (result.failureMessage) console.log(`  error: ${result.failureMessage}`);
  }

  return result.status === "success" ? 0 : 1;
}
