import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import YAML from "yaml";

import type { ParsedCli } from "../parse.ts";
import { ensureDir } from "../../utils/fs.ts";
import { defaultConfig } from "../../config/defaultConfig.ts";
import { loadConfig } from "../../config/loadConfig.ts";

export async function runInit(parsed: ParsedCli): Promise<number> {
  const configPath = parsed.global.configPath ?? path.join(parsed.global.cwd, ".autodemo.yml");

  if (!existsSync(configPath)) {
    const cfg = defaultConfig();
    const yaml = YAML.stringify(cfg);
    await writeFile(configPath, yaml, "utf8");
  }

  const { config } = await loadConfig({ cwd: parsed.global.cwd, configPath });

  const outDir = path.isAbsolute(config.output.dir)
    ? config.output.dir
    : path.join(parsed.global.cwd, config.output.dir);

  await ensureDir(outDir);

  if (parsed.global.json) {
    console.log(JSON.stringify({ status: "ok", configPath, outputDir: outDir }, null, 2));
  } else if (!parsed.global.noTui) {
    console.log(`Initialized ${configPath}`);
  }

  return 0;
}


