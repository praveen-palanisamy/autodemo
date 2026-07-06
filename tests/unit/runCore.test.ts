import { test, expect } from "bun:test";

import { filterScenarioNamesForRun } from "../../src/cli/logic/runCore.ts";
import type { AutoDemoConfig } from "../../src/config/schema.ts";

const scenarios = {
  login: { internal: true, steps: [{ type: "goto" as const, url: "/" }] },
  tour: { steps: [{ type: "goto" as const, url: "/dash" }] },
} satisfies AutoDemoConfig["scenarios"];

test("filterScenarioNamesForRun skips internal scenarios for --all", () => {
  const filtered = filterScenarioNamesForRun(scenarios, true, undefined, new Set());
  expect(filtered).toEqual(["tour"]);
});

test("filterScenarioNamesForRun honors --exclude", () => {
  const named = {
    a: { steps: [{ type: "goto" as const, url: "/" }] },
    b: { steps: [{ type: "goto" as const, url: "/b" }] },
  } satisfies AutoDemoConfig["scenarios"];

  const filtered = filterScenarioNamesForRun(named, true, undefined, new Set(["b"]));
  expect(filtered).toEqual(["a"]);
});
