import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Bump = "patch" | "minor" | "major";

function parseArgs(argv: string[]): { bump?: Bump; version?: string } {
  const bump = argv.find((a) => a.startsWith("--bump="))?.split("=")[1] as Bump | undefined;
  const version = argv.find((a) => a.startsWith("--version="))?.split("=")[1];
  return { bump, version };
}

function bumpSemver(v: string, bump: Bump): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  const major = Number(m[1]);
  const minor = Number(m[2]);
  const patch = Number(m[3]);
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major + 1}.0.0`;
}

function today(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main(): Promise<void> {
  const { bump, version } = parseArgs(process.argv.slice(2));
  if (!bump && !version) {
    throw new Error("Usage: bun run release:prepare -- --bump=patch|minor|major  OR  --version=X.Y.Z");
  }

  const repoRoot = process.cwd();
  const pkgPath = path.join(repoRoot, "package.json");
  const versionTsPath = path.join(repoRoot, "src", "version.ts");
  const changelogPath = path.join(repoRoot, "CHANGELOG.md");

  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as { version: string };
  const next = version ?? bumpSemver(pkg.version, bump!);

  // package.json
  const pkgText = await readFile(pkgPath, "utf8");
  const pkgUpdated = pkgText.replace(/"version"\s*:\s*"\d+\.\d+\.\d+"/, `"version": "${next}"`);
  await writeFile(pkgPath, pkgUpdated, "utf8");

  // src/version.ts
  const versionTs = await readFile(versionTsPath, "utf8");
  const versionTsUpdated = versionTs.replace(/export const VERSION = "\d+\.\d+\.\d+";/, `export const VERSION = "${next}";`);
  await writeFile(versionTsPath, versionTsUpdated, "utf8");

  // CHANGELOG.md: move Unreleased → vX.Y.Z (YYYY-MM-DD), keep Unreleased header.
  const ch = await readFile(changelogPath, "utf8");
  if (!ch.includes("### Unreleased")) {
    throw new Error("CHANGELOG.md must contain a '### Unreleased' section");
  }
  const date = today();
  const updated = ch.replace("### Unreleased", `### Unreleased\n\n- (add changes here)\n\n### ${next} (${date})`);
  await writeFile(changelogPath, updated, "utf8");

  console.log(`Prepared release ${next}`);
  console.log(`- updated package.json`);
  console.log(`- updated src/version.ts`);
  console.log(`- updated CHANGELOG.md`);
}

await main();


