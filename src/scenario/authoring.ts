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
  configObj: Record<string, any>,
  input: UpsertScenarioInput,
): Record<string, any> {
  const cfg = { ...configObj };

  cfg.project ??= {};
  cfg.project.baseUrl ??= input.url;

  cfg.scenarios ??= {};
  cfg.scenarios[input.name] = {
    description: `Recorded: ${input.instruction}`,
    steps: [
      { type: "goto", url: "/" },
      { type: "act", instruction: input.instruction },
    ],
  };

  return cfg;
}


