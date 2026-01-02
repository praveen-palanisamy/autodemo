import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import YAML from "yaml";

import type { ParsedCli } from "../parse.ts";
import { ensureDir } from "../../utils/fs.ts";
import { defaultConfig } from "../../config/defaultConfig.ts";

export async function runInit(parsed: ParsedCli): Promise<void> {
  const configPath = parsed.global.configPath ?? path.join(parsed.global.cwd, ".autodemo.yml");

  if (!existsSync(configPath)) {
    const cfg = defaultConfig();
    const yaml = YAML.stringify(cfg);
    await writeFile(configPath, yaml, "utf8");
  }

  // Ensure output dir exists (best effort).
  const outDir = path.join(parsed.global.cwd, "public", "demos");
  await ensureDir(outDir);
}


