import path from "node:path";

import type { ParsedCli } from "../parse.ts";
import { popFlag, popOption } from "../argUtils.ts";
import { loadConfig } from "../../config/loadConfig.ts";
import { runScenario } from "../../scenario/runner.ts";

export async function runRun(parsed: ParsedCli): Promise<void> {
  const argv = [...parsed.args];
  const all = popFlag(argv, "--all");
  const urlOverride = popOption(argv, "--url");
  const outDirOverride = popOption(argv, "--outDir");
  const headless = popFlag(argv, "--headless");
  const debug = popFlag(argv, "--debug");

  const scenarioName = all ? undefined : argv[0];
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
    : path.join(parsed.global.cwd, config.output.dir);

  const scenarioNames = all ? Object.keys(config.scenarios) : [scenarioName!];
  if (scenarioNames.length === 0) throw new Error("No scenarios found in config.");

  const results = [];
  let anyFailure = false;

  for (const name of scenarioNames) {
    const result = await runScenario({
      config,
      scenarioName: name,
      baseUrl,
      outputDirBase,
      headless: headless ? true : undefined,
      debug,
    });
    results.push({ scenario: name, status: result.status, outDir: result.outDir, artifacts: result.artifacts });
    if (result.status !== "success") anyFailure = true;
  }

  if (parsed.global.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ status: anyFailure ? "failure" : "success", results }, null, 2));
  } else {
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(`${r.status.padEnd(7)} ${r.scenario} → ${r.outDir}`);
    }
  }

  process.exit(anyFailure ? 1 : 0);
}


