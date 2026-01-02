import type { ParsedCli } from "../parse.ts";
import { runDoctorChecks } from "../../doctor/doctor.ts";

export async function runDoctor(parsed: ParsedCli): Promise<number> {
  const report = await runDoctorChecks();

  if (parsed.global.json) {
    console.log(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  for (const check of report.checks) {
    const status = check.ok ? "ok" : "fail";
    console.log(`${status.padEnd(4)} ${check.name}${check.message ? ` — ${check.message}` : ""}`);
  }

  return report.ok ? 0 : 1;
}


