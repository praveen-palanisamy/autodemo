import type { ParsedCli } from "../parse.ts";
import { shouldUseInk } from "../ink/shouldUseInk.ts";
import { runCore } from "../logic/runCore.ts";

async function runInk(parsed: ParsedCli): Promise<number> {
  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { RunApp } = await import("../ink/apps/RunApp.tsx");

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
    instance = render(React.createElement(RunApp, { parsed, onDone }));
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


