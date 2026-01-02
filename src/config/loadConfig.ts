import path from "node:path";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

import { AutoDemoConfigSchema, type AutoDemoConfig } from "./schema.ts";

export type LoadConfigResult = {
  config: AutoDemoConfig;
  configPath: string;
};

export async function loadConfig(opts: {
  cwd: string;
  configPath?: string;
}): Promise<LoadConfigResult> {
  const configPath = opts.configPath ?? path.join(opts.cwd, ".autodemo.yml");
  const raw = await readFile(configPath, "utf8");
  const parsed = YAML.parse(raw);

  const config = AutoDemoConfigSchema.parse(parsed);

  return { config, configPath };
}


