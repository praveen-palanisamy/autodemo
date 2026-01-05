import path from "node:path";
import { spawn } from "node:child_process";

function run(cmd: string, args: string[], opts?: { cwd?: string; env?: Record<string, string> }): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd: opts?.cwd,
      env: { ...process.env, ...(opts?.env ?? {}) },
      stdio: "inherit",
    });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function waitForOk(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function popOption(argv: string[], name: string): string | undefined {
  const idx = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return undefined;
  const raw = argv[idx];
  argv.splice(idx, 1);
  if (raw.includes("=")) return raw.split("=").slice(1).join("=") || undefined;
  const v = argv[idx];
  if (v && !v.startsWith("--")) argv.splice(idx, 1);
  return v;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const port = Number(popOption(argv, "--port") ?? process.env.PORT ?? "4173");
  const baseUrl = `http://127.0.0.1:${port}`;

  // Build site first (ensures site/src exists and site/dist is clean).
  await run("bun", ["run", "site:build"]);

  // Serve site/dist and run a deterministic demo scenario against it.
  const serveArgs = ["run", "scripts/siteServe.ts", "--", "--port", String(port)];
  const server = spawn("bun", serveArgs, { stdio: "inherit" });
  try {
    await waitForOk(`${baseUrl}/`, 20_000);
    const cfg = path.join("configs", "site-demo.autodemo.yaml");
    await run("bun", [
      "run",
      "./bin/autodemo.ts",
      "run",
      "site-landing",
      "--config",
      cfg,
      "--url",
      baseUrl,
      "--headless",
      "--no-tui",
      "--debug",
    ]);
  } finally {
    try {
      server.kill("SIGTERM");
    } catch {
      // ignore
    }
  }

  // Rebuild site so GitHub Pages picks up any updated demo artifacts.
  await run("bun", ["run", "site:build"]);
}

await main();


