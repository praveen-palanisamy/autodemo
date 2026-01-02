import { AvailableModelSchema, Stagehand, type AvailableModel, type Page as StagehandPage } from "@browserbasehq/stagehand";
import type { Page } from "@playwright/test";

export type StagehandSession = {
  stagehand: Stagehand;
};

export type CreateStagehandSessionOpts = {
  // If Stagehand supports binding to an existing Playwright page, we pass it through.
  page?: Page;
  browserbaseApiKey?: string;
  env: "LOCAL" | "BROWSERBASE";
  modelName?: string;
};

export async function createStagehandSession(opts: CreateStagehandSessionOpts): Promise<StagehandSession> {
  const modelName: AvailableModel | undefined = opts.modelName
    ? AvailableModelSchema.safeParse(opts.modelName).success
      ? (opts.modelName as AvailableModel)
      : undefined
    : undefined;

  const stagehand = new Stagehand({
    env: opts.env,
    ...(opts.browserbaseApiKey ? { apiKey: opts.browserbaseApiKey } : {}),
    ...(modelName ? { modelName } : {}),
  });

  if (opts.page) {
    // Deprecated in Stagehand v1.x, but needed to share a single Playwright session with fallback steps.
    await stagehand.initFromPage({ page: opts.page as unknown as StagehandPage });
  } else {
    await stagehand.init();
  }

  return { stagehand };
}

export async function closeStagehandSession(session: StagehandSession): Promise<void> {
  await session.stagehand.close();
}


