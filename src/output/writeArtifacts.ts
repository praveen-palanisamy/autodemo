import path from "node:path";
import { writeFile } from "node:fs/promises";

import type { RunJson } from "./types.ts";
import { ensureDir } from "../utils/fs.ts";
import { stepsDir } from "./paths.ts";
import { generateInteractiveHtml } from "./interactive/generateInteractiveHtml.ts";

export async function writeInteractiveHtml(outDir: string): Promise<string> {
  await ensureDir(outDir);
  const htmlPath = path.join(outDir, "index.html");
  await writeFile(htmlPath, generateInteractiveHtml(), "utf8");
  return htmlPath;
}

export async function writeRunJson(outDir: string, run: RunJson): Promise<string> {
  await ensureDir(outDir);
  await ensureDir(stepsDir(outDir));
  const runJsonPath = path.join(outDir, "run.json");
  await writeFile(runJsonPath, JSON.stringify(run, null, 2), "utf8");
  return runJsonPath;
}


