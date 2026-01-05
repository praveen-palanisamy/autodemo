import path from "node:path";
import { readFile, stat } from "node:fs/promises";

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

function contentType(p: string): string {
  const ext = p.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
      return "text/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "webm":
      return "video/webm";
    case "mp4":
      return "video/mp4";
    default:
      return "application/octet-stream";
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

const argv = process.argv.slice(2);
const dir = popOption(argv, "--dir") ?? path.join(process.cwd(), "site", "dist");
const port = Number(popOption(argv, "--port") ?? process.env.PORT ?? "4173");

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const rawPath = decodeURIComponent(url.pathname);
    const safePath = rawPath.replaceAll("..", "");
    const requested = safePath === "/" ? "/index.html" : safePath;
    const filePath = path.join(dir, requested);
    if (!(await exists(filePath))) {
      return new Response("Not Found", { status: 404 });
    }
    const data = await readFile(filePath);
    return new Response(data, {
      headers: {
        "content-type": contentType(filePath),
        "cache-control": "no-cache",
      },
    });
  },
});

console.log(`Serving ${dir}`);
console.log(`http://127.0.0.1:${server.port}`);


