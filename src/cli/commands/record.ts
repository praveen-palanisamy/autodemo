import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";

import type { ParsedCli } from "../parse.ts";
import { popOption, requireOption } from "../argUtils.ts";
import { defaultConfig } from "../../config/defaultConfig.ts";
import { upsertScenarioFromInstruction } from "../../scenario/authoring.ts";

export async function runRecord(parsed: ParsedCli): Promise<void> {
  const argv = [...parsed.args];
  const url = popOption(argv, "--url");
  const instruction = popOption(argv, "--instruction");
  const out = popOption(argv, "--out");
  const name = popOption(argv, "--name") ?? "recorded";

  const resolvedUrl = requireOption(url, "--url");
  const resolvedInstruction = requireOption(instruction, "--instruction");

  const configPath = out ?? parsed.global.configPath ?? path.join(parsed.global.cwd, ".autodemo.yml");

  const configObj = existsSync(configPath)
    ? YAML.parse(await readFile(configPath, "utf8"))
    : defaultConfig();

  const updated = upsertScenarioFromInstruction(configObj, {
    name,
    url: resolvedUrl,
    instruction: resolvedInstruction,
  });

  await writeFile(configPath, YAML.stringify(updated), "utf8");

  if (!parsed.global.json) {
    // eslint-disable-next-line no-console
    console.log(`Wrote scenario '${name}' to ${configPath}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ status: "ok", scenario: name, configPath }, null, 2));
  }
}


