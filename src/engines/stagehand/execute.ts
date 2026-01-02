import type { ScenarioStep } from "../../config/schema.ts";

export async function executeStagehandStep(opts: {
  stagehand: any;
  step: ScenarioStep;
}): Promise<void> {
  const { stagehand, step } = opts;
  if (step.type !== "act") {
    throw new Error(`Internal error: non-act step routed to Stagehand executor: ${step.type}`);
  }

  // Stagehand commonly exposes actions on `stagehand.page.act("...")`.
  if (stagehand?.page && typeof stagehand.page.act === "function") {
    await stagehand.page.act(step.instruction);
    return;
  }

  // Fallback for older/newer API shapes.
  if (typeof stagehand.act === "function") {
    try {
      await stagehand.act({ action: step.instruction });
      return;
    } catch {
      await stagehand.act(step.instruction);
      return;
    }
  }

  throw new Error("Stagehand is missing an act() API. Check your @browserbasehq/stagehand version.");
}


