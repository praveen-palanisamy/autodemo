import type { ParsedCli } from "../parse.ts";
import { runDoctorChecks } from "../../doctor/doctor.ts";

export async function runDoctor(parsed: ParsedCli): Promise<void> {
  const report = await runDoctorChecks({ cwd: parsed.global.cwd });

  if (parsed.global.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }

  for (const check of report.checks) {
    const status = check.ok ? "ok" : "fail";
    // eslint-disable-next-line no-console
    console.log(`${status.padEnd(4)} ${check.name}${check.message ? ` — ${check.message}` : ""}`);
  }

  process.exit(report.ok ? 0 : 1);
}


