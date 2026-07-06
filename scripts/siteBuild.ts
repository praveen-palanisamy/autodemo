import path from "node:path";
import { cp, readdir, stat, writeFile } from "node:fs/promises";
import { ensureDir, rmrf } from "../src/utils/fs.ts";

/** Files not published to GitHub Pages (debug/heavy intermediates). */
const PAGES_DEMO_SKIP = new Set([
  "trace.zip",
  "frames.ffconcat",
  "video-raw",
  "video.webm",
]);

function skipDemoPublishable(name: string): boolean {
  return PAGES_DEMO_SKIP.has(name) || name.endsWith(".webm");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(
  src: string,
  dest: string,
  opts?: { skipFile?: (name: string) => boolean },
): Promise<void> {
  await ensureDir(dest);
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    if (e.isFile() && opts?.skipFile?.(e.name)) continue;
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(from, to, opts);
    } else if (e.isFile()) {
      await ensureDir(path.dirname(to));
      await cp(from, to);
    }
  }
}

async function main(): Promise<void> {
  const root = process.cwd();
  const srcDir = path.join(root, "site", "src");
  const distDir = path.join(root, "site", "dist");

  await rmrf(distDir);
  await copyDir(srcDir, distDir);

  const docsSrc = path.join(root, "docs");
  const docsDest = path.join(distDir, "docs");
  if (await pathExists(docsSrc)) {
    await copyDir(docsSrc, docsDest);
  }

  const demosSrc = path.join(root, "public", "demos");
  const demosDest = path.join(distDir, "demos");
  if (await pathExists(demosSrc)) {
    await copyDir(demosSrc, demosDest, { skipFile: skipDemoPublishable });
  }

  const installSrc = path.join(root, "install.sh");
  if (await pathExists(installSrc)) {
    await cp(installSrc, path.join(distDir, "install.sh"));
  }

  // Disable Jekyll so underscore paths and raw static assets deploy as-is.
  await writeFile(path.join(distDir, ".nojekyll"), "", "utf8");

  console.log(`Built site: ${distDir}`);
}

await main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
