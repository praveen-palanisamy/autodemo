import path from "node:path";
import { cp, readdir, stat } from "node:fs/promises";
import { ensureDir, rmrf } from "../src/utils/fs.ts";

async function main(): Promise<void> {
async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(from, to);
    } else if (e.isFile()) {
      await ensureDir(path.dirname(to));
      await cp(from, to);
    }
  }
}

const root = process.cwd();
const srcDir = path.join(root, "site", "src");
const distDir = path.join(root, "site", "dist");

await rmrf(distDir);
await copyDir(srcDir, distDir);

// Copy docs (as Markdown files). Pages will serve them as plain text by default.
const docsSrc = path.join(root, "docs");
const docsDest = path.join(distDir, "docs");
if (await pathExists(docsSrc)) {
  await copyDir(docsSrc, docsDest);
}

// Embed latest demo artifacts into the Pages site.
const demosSrc = path.join(root, "public", "demos");
const demosDest = path.join(distDir, "demos");
if (await pathExists(demosSrc)) {
  await copyDir(demosSrc, demosDest);
}

// Serve the installer from the site too (short URL: <pages>/install.sh).
const installSrc = path.join(root, "install.sh");
if (await pathExists(installSrc)) {
  await cp(installSrc, path.join(distDir, "install.sh"));
}

console.log(`Built site: ${distDir}`);
}

await main().catch((err) => {
  // Bun sometimes swallows top-level stack traces in certain environments.
  console.error(err);
  process.exitCode = 1;
});


