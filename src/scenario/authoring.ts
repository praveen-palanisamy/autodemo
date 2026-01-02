export type UpsertScenarioInput = {
  name: string;
  url: string;
  instruction: string;
};

/**
 * Minimal v0.1 authoring: create/update a scenario that uses a single `act` step.
 * This keeps `record` usable even when Stagehand cannot reliably provide a structured step list.
 */
export function upsertScenarioFromInstruction(
  configObj: Record<string, unknown>,
  input: UpsertScenarioInput,
): Record<string, unknown> {
  const cfg: Record<string, unknown> = { ...configObj };

  const project = (cfg.project as Record<string, unknown> | undefined) ?? {};
  if (project.baseUrl === undefined) project.baseUrl = input.url;
  cfg.project = project;

  const scenarios = (cfg.scenarios as Record<string, unknown> | undefined) ?? {};
  scenarios[input.name] = {
    description: `Recorded: ${input.instruction}`,
    steps: [
      { type: "goto", url: "/" },
      { type: "act", instruction: input.instruction },
    ],
  };
  cfg.scenarios = scenarios;

  return cfg;
}


