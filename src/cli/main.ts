import { runInit } from "./commands/init.ts";
import { runRun } from "./commands/run.ts";
import { runRecord } from "./commands/record.ts";
import { runDoctor } from "./commands/doctor.ts";
import { runMcp } from "./commands/mcp.ts";
import { parseCli } from "./parse.ts";
import { formatCliError, printHelp } from "./ui/help.ts";
import { CliConfigError, CliUsageError } from "./errors.ts";

export async function main(argv: string[]): Promise<void> {
  const parsed = parseCli(argv);

  // Global help
  if (
    parsed.command === "help" ||
    parsed.command === undefined ||
    parsed.args.includes("--help") ||
    parsed.args.includes("-h")
  ) {
    printHelp(parsed);
    return;
  }

  try {
    let code = 0;
    switch (parsed.command) {
      case "init":
        code = await runInit(parsed);
        break;
      case "record":
        code = await runRecord(parsed);
        break;
      case "run":
        code = await runRun(parsed);
        break;
      case "doctor":
        code = await runDoctor(parsed);
        break;
      case "mcp":
        await runMcp(parsed);
        return;
      default:
        throw new Error(`Unknown command: ${parsed.command}`);
    }
    // Avoid process.exit() so SIGINT handlers and async cleanup can complete.
    process.exitCode = code;
    return;
  } catch (err) {
    const isUsage = err instanceof CliUsageError || err instanceof CliConfigError;
    const message = formatCliError(err);
    if (parsed.global.json) {
      // Minimal structured error for CI/automation.
      console.error(JSON.stringify({ status: "error", message }, null, 2));
    } else {
      console.error(message);
    }
    process.exitCode = isUsage ? 2 : 1;
    return;
  }
}


