#!/usr/bin/env bun
/**
 * Idempotent install for bash tab completion on `bun run <script>`.
 *
 * Writes scripts/completions/bun.bash to ~/.local/share/autodemo/bun.bash
 * and appends a source line to ~/.bashrc when missing.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..");
const sourcePath = path.join(repoRoot, "scripts", "completions", "bun.bash");
const destDir = path.join(homedir(), ".local", "share", "autodemo");
const destPath = path.join(destDir, "bun.bash");
const marker = "# autodemo bun tab completion";
const sourceLine = `[ -f "${destPath}" ] && . "${destPath}"  ${marker}`;

await mkdir(destDir, { recursive: true });
await Bun.write(destPath, await Bun.file(sourcePath).text());

const bashrc = path.join(homedir(), ".bashrc");
try {
  const rc = await readFile(bashrc, "utf8");
  if (rc.includes(marker)) {
    console.log(`Shell completion already configured (${destPath}).`);
  } else {
    await appendFile(bashrc, `\n${sourceLine}\n`);
    console.log(`Installed shell completion to ${destPath}`);
    console.log(`Appended source line to ${bashrc}`);
    console.log("Restart your shell or run: source ~/.bashrc");
  }
} catch {
  console.log(`Installed shell completion to ${destPath}`);
  console.log(`Add this line to your shell profile:\n  . "${destPath}"`);
}
