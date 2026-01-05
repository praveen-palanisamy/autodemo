import type { ParsedCli } from "../parse.ts";
import { VERSION } from "../../version.ts";

export function printHelp(parsed: ParsedCli): void {
  const command = parsed.command;
  const cmdLines =
    command === "run"
      ? [
          "Run:",
          "  autodemo run <scenario> [--url <url>] [--headless] [--config <path>]",
          "  autodemo run --all [--url <url>] [--headless] [--config <path>]",
          "  autodemo run --interactive   # run wizard (pick config/scenario/url)",
          "",
        ]
      : command === "record"
        ? [
            "Record:",
            "  autodemo record --url <url> --instruction \"...\" --name <scenario>",
            "  autodemo record --interactive   # capture real interactions",
            "",
          ]
        : [];

  const lines = [
    `autodemo — Stagehand-first demo automation (v${VERSION})`,
    "",
    "Usage:",
    "  autodemo <command> [options]",
    "",
    ...cmdLines,
    "Commands:",
    "  init                 Create .autodemo.yml (idempotent) and output dir",
    "  record               Generate/update a scenario from an instruction",
    "  run <scenario>|--all Run a scenario (or all scenarios)",
    "  doctor               Verify local dependencies (ffmpeg, browsers, etc.)",
    "  mcp                  Start MCP server over stdio",
    "",
    "Global options:",
    "  --config <path>   Path to .autodemo.yml (default: ./.autodemo.yml)",
    "  --tui             Force Ink UI even if stdout isn't detected as a TTY",
    "  --no-tui          Disable Ink UI (recommended in CI)",
    "  --json            Emit structured JSON logs (CI-friendly)",
    "",
    "Run options:",
    "  --url <url>        Override baseUrl",
    "  --outDir <dir>     Override output dir (default: config output.dir)",
    "  --headless         Run browser headless (default: headed)",
    "  --interactive      Launch run wizard (pick config + scenario + url)",
    "  --debug            Save trace.zip even on success",
    "",
  ];

  // Keep it simple; avoid Ink for help to keep CI stable.
  if (!parsed.global.json) {
    console.log(lines.join("\n"));
  } else {
    console.log(JSON.stringify({ help: lines }, null, 2));
  }
}

export function formatCliError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}


