import type { ParsedCli } from "../parse.ts";
import { shouldUseInk } from "../ink/shouldUseInk.ts";
import { runCore } from "../logic/runCore.ts";
import { loadConfig } from "../../config/loadConfig.ts";

async function runInk(parsed: ParsedCli): Promise<number> {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const hasScenario = parsed.args.length > 0 && !parsed.args.includes("--all");
  const wantsWizard = parsed.args.includes("--interactive") || parsed.args.includes("--wizard");
  const hasUrlOverride = parsed.args.some((a) => a === "--url" || a.startsWith("--url="));
  let missingBaseUrl = false;
  if (hasScenario && !hasUrlOverride) {
    try {
      const { config } = await loadConfig({ cwd: parsed.global.cwd, configPath: parsed.global.configPath });
      missingBaseUrl = !config.project.baseUrl;
    } catch {
      // ignore; fall back to normal run error
    }
  }
  const { RunApp } = await import("../ink/apps/RunApp.tsx");
  const { RunWizardApp } = await import("../ink/apps/RunWizardApp.tsx");

  return await new Promise<number>((resolve) => {
    let instance: ReturnType<typeof render> | undefined;
    const onDone = (code: number) => {
      try {
        instance?.unmount();
      } catch {
        // ignore
      }
      resolve(code);
    };
    if (!hasScenario || wantsWizard || missingBaseUrl) {
      instance = render(
        React.createElement(RunWizardApp, {
          cwd: parsed.global.cwd,
          defaultConfigPath: parsed.global.configPath ?? ".autodemo.yml",
          onDone,
          initial: hasScenario ? { scenario: parsed.args[0] } : undefined,
        }),
      );
    } else {
      instance = render(React.createElement(RunApp, { parsed, onDone }));
    }
  });
}

export async function runRun(parsed: ParsedCli): Promise<number> {
  if (shouldUseInk(parsed)) {
    return await runInk(parsed);
  }

  const { results, anyFailure } = await runCore(parsed);
  if (parsed.global.json) {
    console.log(JSON.stringify({ status: anyFailure ? "failure" : "success", results }, null, 2));
  } else {
    for (const r of results) {
      console.log(`${r.status.padEnd(7)} ${r.scenario} → ${r.outDir}`);
    }
  }

  return anyFailure ? 1 : 0;
}


