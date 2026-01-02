import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import type { ParsedCli } from "../parse.ts";
import { ensureDir } from "../../utils/fs.ts";
import { loadConfig } from "../../config/loadConfig.ts";
import { defaultAutodemoYamlTemplate } from "../../config/templates/autodemoYaml.ts";

export async function runInit(parsed: ParsedCli): Promise<number> {
  const configPath = parsed.global.configPath ?? path.join(parsed.global.cwd, ".autodemo.yml");

  if (!existsSync(configPath)) {
    await writeFile(configPath, defaultAutodemoYamlTemplate(), "utf8");
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


