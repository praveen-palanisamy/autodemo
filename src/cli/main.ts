import { runInit } from "./commands/init.ts";
import { runRun } from "./commands/run.ts";
import { runRecord } from "./commands/record.ts";
import { runDoctor } from "./commands/doctor.ts";
import { runMcp } from "./commands/mcp.ts";
import { parseCli } from "./parse.ts";
import { formatCliError, printHelp } from "./ui/help.ts";

export async function main(argv: string[]): Promise<void> {
  const parsed = parseCli(argv);

  if (parsed.command === "help" || parsed.command === undefined) {
    printHelp(parsed);
    process.exit(0);
  }

  try {
    switch (parsed.command) {
      case "init":
        await runInit(parsed);
        return;
      case "record":
        await runRecord(parsed);
        return;
      case "run":
        await runRun(parsed);
        return;
      case "doctor":
        await runDoctor(parsed);
        return;
      case "mcp":
        await runMcp(parsed);
        return;
      default:
        throw new Error(`Unknown command: ${parsed.command}`);
    }
  } catch (err) {
    const message = formatCliError(err);
    if (parsed.global.json) {
      // Minimal structured error for CI/automation.
      console.error(JSON.stringify({ status: "error", message }, null, 2));
    } else {
      console.error(message);
    }
    process.exit(1);
  }
}


