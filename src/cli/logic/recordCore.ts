import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";

import { defaultConfig } from "../../config/defaultConfig.ts";
import { upsertScenarioFromInstruction } from "../../scenario/authoring.ts";

export type RecordCoreInput = {
  cwd: string;
  url: string;
  instruction: string;
  name: string;
  configPath: string;
};

export async function recordCore(input: RecordCoreInput): Promise<{ scenario: string; configPath: string }> {
  const configPathAbs = path.isAbsolute(input.configPath)
    ? input.configPath
    : path.join(input.cwd, input.configPath);

  const configObj = existsSync(configPathAbs)
    ? YAML.parse(await readFile(configPathAbs, "utf8"))
    : defaultConfig();

  const updated = upsertScenarioFromInstruction(configObj, {
    name: input.name,
    url: input.url,
    instruction: input.instruction,
  });

  await writeFile(configPathAbs, YAML.stringify(updated), "utf8");
  return { scenario: input.name, configPath: configPathAbs };
}


