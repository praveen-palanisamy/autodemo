import path from "node:path";
import { cp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { ensureDir, rmrf } from "../src/utils/fs.ts";

/** Files not published to GitHub Pages (debug/heavy intermediates). */
const PAGES_DEMO_SKIP = new Set(["trace.zip", "frames.ffconcat", "video-raw", "video.webm"]);

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

const SITE_URL = "https://praveen-palanisamy.github.io/autodemo/";
const REPO_URL = "https://github.com/praveen-palanisamy/autodemo";
const AUTHOR = "Praveen Palanisamy";

/** Replace {{VERSION}} / {{BUILD_DATE}} in the copied HTML so metadata never goes stale. */
async function injectTokens(distDir: string, version: string, buildDate: string): Promise<void> {
  for (const name of ["index.html", "docs.html"]) {
    const file = path.join(distDir, name);
    if (!(await pathExists(file))) continue;
    const html = await readFile(file, "utf8");
    await writeFile(
      file,
      html.replaceAll("{{VERSION}}", version).replaceAll("{{BUILD_DATE}}", buildDate),
      "utf8",
    );
  }
}

/** robots.txt, sitemap.xml, llms.txt, llms-full.txt, humans.txt for search engines and LLM crawlers. */
async function writeDiscoveryFiles(
  root: string,
  distDir: string,
  version: string,
  buildDate: string,
  docFiles: string[],
): Promise<void> {
  const pages = [
    SITE_URL,
    `${SITE_URL}docs.html`,
    `${SITE_URL}demos/site-landing/latest/index.html`,
  ];
  await writeFile(
    path.join(distDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n# Source: ${REPO_URL}\n`,
    "utf8",
  );
  await writeFile(
    path.join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map(
        (u) =>
          `  <url><loc>${u}</loc><lastmod>${buildDate}</lastmod><changefreq>weekly</changefreq><priority>${u === SITE_URL ? "1.0" : "0.7"}</priority></url>`,
      )
      .join("\n")}\n</urlset>\n`,
    "utf8",
  );
  const docLinks = docFiles
    .map((f) => `- [${f.replace(/\.md$/, "").replace(/_/g, " ")}](${SITE_URL}docs/${f})`)
    .join("\n");
  await writeFile(
    path.join(distDir, "llms.txt"),
    `# AutoDemo

> Demos as code (v${version}). Open-source (MIT) CLI that turns a running web app into demo videos, interactive walkthroughs and marketing captures from one command — YAML or natural-language scenarios, regenerated in CI, operable by AI agents via MCP.

Author: ${AUTHOR} (https://github.com/praveen-palanisamy)
Source: ${REPO_URL}
npm: https://www.npmjs.com/package/@praveen-palanisamy/autodemo
GitHub Action: uses: praveen-palanisamy/autodemo@v0
Install: curl -fsSL https://raw.githubusercontent.com/praveen-palanisamy/autodemo/main/install.sh | bash

## Docs

- [README](${REPO_URL}#readme)
${docLinks}
- [Full text](${SITE_URL}llms-full.txt)

## Key facts

- One run produces video.mp4, an interactive index.html walkthrough (steps + run.json) and named marketing stills.
- Scenarios live in .autodemo.yml (deterministic) or are authored/executed in plain English with any LLM (OpenAI, Anthropic, Ollama); no LLM is required for YAML scenarios.
- CI-native: GitHub Action and JSON CLI output; MCP server exposes the same capabilities to AI agents.
- No telemetry; artifacts stay in your repo or CI.
`,
    "utf8",
  );
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const docsText = await Promise.all(
    docFiles.map(
      async (f) =>
        `\n\n---\n\n<!-- ${REPO_URL}/blob/main/docs/${f} -->\n\n${await readFile(path.join(root, "docs", f), "utf8")}`,
    ),
  );
  await writeFile(
    path.join(distDir, "llms-full.txt"),
    `# AutoDemo v${version} — full documentation\nSource: ${REPO_URL}\n\n${readme}${docsText.join("")}`,
    "utf8",
  );
  await writeFile(
    path.join(distDir, "humans.txt"),
    `/* TEAM */\nAuthor: ${AUTHOR}\nSite: https://github.com/praveen-palanisamy\n\n/* SITE */\nProject: AutoDemo v${version}\nSource: ${REPO_URL}\nLicense: MIT\nLast update: ${buildDate}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const root = process.cwd();
  const srcDir = path.join(root, "site", "src");
  const distDir = path.join(root, "site", "dist");
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
    version: string;
  };
  const buildDate = new Date().toISOString().slice(0, 10);

  await rmrf(distDir);
  await copyDir(srcDir, distDir);
  await injectTokens(distDir, pkg.version, buildDate);

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

  const docFiles = (await pathExists(docsSrc))
    ? (await readdir(docsSrc)).filter((f) => f.endsWith(".md")).sort()
    : [];
  await writeDiscoveryFiles(root, distDir, pkg.version, buildDate, docFiles);

  // Disable Jekyll so underscore paths and raw static assets deploy as-is.
  await writeFile(path.join(distDir, ".nojekyll"), "", "utf8");

  console.log(`Built site: ${distDir}`);
}

await main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
