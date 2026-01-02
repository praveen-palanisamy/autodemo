import path from "node:path";
import { readFile } from "node:fs/promises";
import YAML from "yaml";

import { AutoDemoConfigSchema, type AutoDemoConfig } from "./schema.ts";
import { CliConfigError } from "../cli/errors.ts";

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

  let config: AutoDemoConfig;
  try {
    config = AutoDemoConfigSchema.parse(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new CliConfigError(`Invalid config at ${configPath}: ${message}`);
  }

  return { config, configPath };
}


