import { test, expect } from "bun:test";

import type { AutoDemoConfig } from "../../src/config/schema.ts";

/** Mirrors runCore scenario filtering for --all + internal + --exclude. */
function filterScenarioNames(
  config: AutoDemoConfig,
  all: boolean,
  scenarioName: string | undefined,
  excludeNames: Set<string>,
): string[] {
  const names = all ? Object.keys(config.scenarios) : scenarioName ? [scenarioName] : [];
  return names.filter((name) => {
    if (excludeNames.has(name)) return false;
    if (all && config.scenarios[name]?.internal) return false;
    return true;
  });
}

test("filterScenarioNames skips internal scenarios for --all", () => {
  const config = {
    project: { name: "T" },
    output: { dir: "out", clean: true, branding: true },
    browser: {
      headless: false,
      viewport: { width: 1600, height: 900 },
      recordVideo: false,
      cursor: {},
      transitions: {},
      capture: {},
      video: {},
    },
    auth: {},
    recording: { events: ["click"], scrollThrottleMs: 300 },
    scenarios: {
      login: { internal: true, steps: [{ type: "goto" as const, url: "/" }] },
      tour: { steps: [{ type: "goto" as const, url: "/dash" }] },
    },
  } satisfies AutoDemoConfig;

  const filtered = filterScenarioNames(config, true, undefined, new Set());
  expect(filtered).toEqual(["tour"]);
});

test("filterScenarioNames honors --exclude", () => {
  const config = {
    project: { name: "T" },
    output: { dir: "out", clean: true, branding: true },
    browser: {
      headless: false,
      viewport: { width: 1600, height: 900 },
      recordVideo: false,
      cursor: {},
      transitions: {},
      capture: {},
      video: {},
    },
    auth: {},
    recording: { events: ["click"], scrollThrottleMs: 300 },
    scenarios: {
      a: { steps: [{ type: "goto" as const, url: "/" }] },
      b: { steps: [{ type: "goto" as const, url: "/b" }] },
    },
  } satisfies AutoDemoConfig;

  const filtered = filterScenarioNames(config, true, undefined, new Set(["b"]));
  expect(filtered).toEqual(["a"]);
});
