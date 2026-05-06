import { test, expect } from "bun:test";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../src/config/loadConfig.ts";

test("loadConfig parses minimal .autodemo.yml", async () => {
  const cwd = process.cwd();
  const tmpDir = path.join(cwd, ".autodemo-out", "unit");
  await mkdir(tmpDir, { recursive: true });
  await Bun.write(path.join(tmpDir, ".keep"), "");

  const cfgPath = path.join(tmpDir, ".autodemo.yml");
  await writeFile(
    cfgPath,
    `
project:
  name: TestApp
output:
  dir: .autodemo-out/demos
scenarios:
  hello:
    steps:
      - type: goto
        url: /
        asset:
          name: landing-page
      - type: screenshot
        name: hero-panel
        selector: "[data-autodemo=hero]"
`,
    "utf8",
  );

  const { config } = await loadConfig({ cwd, configPath: cfgPath });
  expect(config.project.name).toBe("TestApp");
  expect(config.output.dir).toBe(".autodemo-out/demos");
  expect(Object.keys(config.scenarios)).toEqual(["hello"]);
  const screenshotStep = config.scenarios.hello.steps[1];
  expect(screenshotStep?.type).toBe("screenshot");
  if (screenshotStep?.type === "screenshot") {
    expect(screenshotStep.name).toBe("hero-panel");
  }
  expect(config.auth.saveState).toBe(false);
});


