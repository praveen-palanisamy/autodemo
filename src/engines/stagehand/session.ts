export type StagehandSession = {
  stagehand: any;
};

export type CreateStagehandSessionOpts = {
  // If Stagehand supports binding to an existing Playwright page, we pass it through.
  page?: any;
  browserbaseApiKey?: string;
  env: "LOCAL" | "BROWSERBASE";
  modelName?: string;
};

export async function createStagehandSession(opts: CreateStagehandSessionOpts): Promise<StagehandSession> {
  const { Stagehand } = await import("@browserbasehq/stagehand");

  const stagehand = new Stagehand({
    env: opts.env,
    ...(opts.browserbaseApiKey ? { apiKey: opts.browserbaseApiKey } : {}),
    ...(opts.modelName ? { modelName: opts.modelName as any } : {}),
  } as any);

  if (opts.page) {
    // Deprecated in Stagehand v1.x, but needed to share a single Playwright session with fallback steps.
    await stagehand.initFromPage({ page: opts.page });
  } else {
    await stagehand.init();
  }

  return { stagehand };
}

export async function closeStagehandSession(session: StagehandSession): Promise<void> {
  const s = session.stagehand;
  if (typeof s.close === "function") {
    await s.close();
    return;
  }
  if (typeof s.dispose === "function") {
    await s.dispose();
  }
}


