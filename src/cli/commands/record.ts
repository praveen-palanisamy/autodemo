import type { ParsedCli } from "../parse.ts";
import { popOption, requireOption } from "../argUtils.ts";
import { shouldUseInk } from "../ink/shouldUseInk.ts";
import { recordCore } from "../logic/recordCore.ts";

export async function runRecord(parsed: ParsedCli): Promise<number> {
  const argv = [...parsed.args];
  const url = popOption(argv, "--url");
  const instruction = popOption(argv, "--instruction");
  const out = popOption(argv, "--out") ?? parsed.global.configPath ?? ".autodemo.yml";
  const name = popOption(argv, "--name") ?? "recorded";

  if (shouldUseInk(parsed) && (!url || !instruction)) {
    const React = (await import("react")).default;
    const { render } = await import("ink");
    const { RecordApp } = await import("../ink/apps/RecordApp.tsx");

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
      instance = render(
        React.createElement(RecordApp, {
          cwd: parsed.global.cwd,
          defaultConfigPath: out,
          onDone,
        }),
      );
    });
  }

  const resolvedUrl = requireOption(url, "--url");
  const resolvedInstruction = requireOption(instruction, "--instruction");

  const res = await recordCore({
    cwd: parsed.global.cwd,
    url: resolvedUrl,
    instruction: resolvedInstruction,
    name,
    configPath: out,
  });

  if (!parsed.global.json) {
    console.log(`Wrote scenario '${res.scenario}' to ${res.configPath}`);
  } else {
    console.log(JSON.stringify({ status: "ok", scenario: res.scenario, configPath: res.configPath }, null, 2));
  }

  return 0;
}


