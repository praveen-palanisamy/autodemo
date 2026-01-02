import type { ScenarioStep } from "../../config/schema.ts";
import type { AnyPage, Stagehand } from "@browserbasehq/stagehand";
import type { Page as PlaywrightPage } from "@playwright/test";

export async function executeStagehandStep(opts: {
  stagehand: Stagehand;
  page: PlaywrightPage;
  step: ScenarioStep;
}): Promise<void> {
  const { stagehand, step } = opts;
  if (step.type !== "act") {
    throw new Error(`Internal error: non-act step routed to Stagehand executor: ${step.type}`);
  }

  const page: AnyPage = opts.page as unknown as AnyPage;
  await stagehand.act(step.instruction, { page });
}


