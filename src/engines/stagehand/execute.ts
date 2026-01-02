import type { ScenarioStep } from "../../config/schema.ts";
import type { Stagehand } from "@browserbasehq/stagehand";

export async function executeStagehandStep(opts: {
  stagehand: Stagehand;
  step: ScenarioStep;
}): Promise<void> {
  const { stagehand, step } = opts;
  if (step.type !== "act") {
    throw new Error(`Internal error: non-act step routed to Stagehand executor: ${step.type}`);
  }

  await stagehand.page.act(step.instruction);
}


