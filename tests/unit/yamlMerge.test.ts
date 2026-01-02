import { test, expect } from "bun:test";
import { mergeScenarioIntoYaml } from "../../src/recording/yamlMerge.ts";

test("mergeScenarioIntoYaml appends scenario and preserves existing scenarios", () => {
  const initial = `
project:
  name: Test
  baseUrl: http://localhost:3000
scenarios:
  existing:
    steps:
      - type: goto
        url: /
`;

  const res = mergeScenarioIntoYaml({
    yamlText: initial,
    scenarioName: "new",
    description: "desc",
    baseUrl: "http://localhost:9999",
    steps: [{ type: "goto", url: "/" }],
  });

  expect(res.yamlText).toContain("existing:");
  expect(res.yamlText).toContain("new:");
  // baseUrl should not be overwritten if already set
  expect(res.yamlText).toContain("baseUrl: http://localhost:3000");
});

test("mergeScenarioIntoYaml avoids overwriting existing scenario name by suffixing", () => {
  const initial = `
project:
  name: Test
scenarios:
  signup:
    steps:
      - type: goto
        url: /
`;

  const res = mergeScenarioIntoYaml({
    yamlText: initial,
    scenarioName: "signup",
    steps: [{ type: "goto", url: "/signup" }],
    baseUrl: "http://localhost:3000",
  });

  expect(res.scenarioName).toBe("signup-2");
  expect(res.yamlText).toContain("signup-2:");
});


