import YAML, { YAMLMap } from "yaml";
import type { ScenarioStep } from "../config/schema.ts";

export function mergeScenarioIntoYaml(opts: {
  yamlText: string;
  scenarioName: string;
  description?: string;
  steps: ScenarioStep[];
  baseUrl?: string;
}): { yamlText: string; scenarioName: string; reusedConfig: boolean } {
  const reusedConfig = opts.yamlText.trim().length > 0;
  const doc = YAML.parseDocument(opts.yamlText);

  if (!doc.get("project")) doc.set("project", {});
  if (opts.baseUrl && !doc.getIn(["project", "baseUrl"])) {
    doc.setIn(["project", "baseUrl"], opts.baseUrl);
  }

  if (!doc.get("scenarios")) {
    doc.set("scenarios", {});
  }

  const scenariosNode = doc.get("scenarios");
  const existingNames: string[] =
    scenariosNode instanceof YAMLMap
      ? scenariosNode.items
          .map((i) => (typeof i.key === "string" ? i.key : i.key?.toString?.()))
          .filter((k): k is string => typeof k === "string")
      : scenariosNode && typeof scenariosNode === "object"
        ? Object.keys(scenariosNode as Record<string, unknown>)
        : [];

  let name = opts.scenarioName;
  if (existingNames.includes(name)) {
    let i = 2;
    while (existingNames.includes(`${name}-${i}`)) i++;
    name = `${name}-${i}`;
  }

  const scenarioNode = doc.createNode(
    {
      ...(opts.description ? { description: opts.description } : {}),
      steps: opts.steps,
    },
    { flow: false },
  );
  doc.setIn(["scenarios", name], scenarioNode);

  return { yamlText: doc.toString(), scenarioName: name, reusedConfig };
}


