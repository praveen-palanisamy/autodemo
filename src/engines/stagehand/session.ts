import type { ModelConfiguration, Stagehand, V3Env, V3Options } from "@browserbasehq/stagehand";

export type StagehandSession = {
  stagehand: Stagehand;
  cdpUrl: string;
};

export type CreateStagehandSessionOpts = {
  env: V3Env;
  browserbaseApiKey?: string;
  headless: boolean;
  viewport: { width: number; height: number };
  modelName?: string;
  llmProvider?: string;
  llmApiKey?: string;
};

export async function createStagehandSession(opts: CreateStagehandSessionOpts): Promise<StagehandSession> {
  // Dynamic import so Playwright-only scenarios can run even if Stagehand has runtime constraints.
  const { Stagehand: StagehandCtor } = await import("@browserbasehq/stagehand");

  const model: ModelConfiguration | undefined = opts.modelName
    ? opts.llmApiKey
      ? ({
          modelName: opts.modelName,
          apiKey: opts.llmApiKey,
          provider: opts.llmProvider,
        } as unknown as ModelConfiguration)
      : (opts.modelName as ModelConfiguration)
    : undefined;

  const stagehandOpts: V3Options = {
    env: opts.env,
    ...(opts.browserbaseApiKey ? { apiKey: opts.browserbaseApiKey } : {}),
    ...(model ? { model } : {}),
    localBrowserLaunchOptions: {
      headless: opts.headless,
      viewport: opts.viewport,
    },
    disablePino: true,
  };

  const stagehand = new StagehandCtor(stagehandOpts);

  await stagehand.init();

  const cdpUrl = stagehand.connectURL();
  return { stagehand, cdpUrl };
}

export async function closeStagehandSession(session: StagehandSession): Promise<void> {
  await session.stagehand.close();
}


