import path from "node:path";

import type { ParsedCli } from "../parse.ts";
import { popFlag, popOption } from "../argUtils.ts";
import { loadConfig } from "../../config/loadConfig.ts";
import { runScenario } from "../../scenario/runner.ts";
import type { ScenarioArtifacts } from "../../scenario/runner.ts";

export type RunCoreResult = {
  results: { scenario: string; status: string; outDir: string; artifacts: ScenarioArtifacts }[];
  anyFailure: boolean;
};

export async function runCore(parsed: ParsedCli): Promise<RunCoreResult> {
  const argv = [...parsed.args];
  const all = popFlag(argv, "--all");
  const urlOverride = popOption(argv, "--url");
  const outDirOverride = popOption(argv, "--outDir");
  const forceHeadless = popFlag(argv, "--headless");
  const debug = popFlag(argv, "--debug");

  let scenarioName = all ? undefined : argv[0];
  if (scenarioName === "scenario") scenarioName = argv[1];
  if (!all && !scenarioName) {
    throw new Error("Missing scenario name (or pass --all)");
  }

  const { config } = await loadConfig({ cwd: parsed.global.cwd, configPath: parsed.global.configPath });

  const baseUrl = urlOverride ?? config.project.baseUrl;
  if (!baseUrl) {
    throw new Error("Missing baseUrl. Set project.baseUrl in .autodemo.yml or pass --url.");
  }

  const outputDirBase = outDirOverride
    ? path.isAbsolute(outDirOverride)
      ? outDirOverride
      : path.join(parsed.global.cwd, outDirOverride)
    : path.isAbsolute(config.output.dir)
      ? config.output.dir
      : path.join(parsed.global.cwd, config.output.dir);

  const scenarioNames = all ? Object.keys(config.scenarios) : [scenarioName!];
  if (scenarioNames.length === 0) throw new Error("No scenarios found in config.");

  const results: RunCoreResult["results"] = [];
  let anyFailure = false;

  for (const name of scenarioNames) {
    const result = await runScenario({
      config,
      scenarioName: name,
      baseUrl,
      outputDirBase,
      headless: forceHeadless ? true : undefined,
      debug,
    });
    results.push({ scenario: name, status: result.status, outDir: result.outDir, artifacts: result.artifacts });
    if (result.status !== "success") anyFailure = true;
  }

  return { results, anyFailure };
}


