import path from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";

export type PageVideo = ReturnType<Page["video"]>;

export type PlaywrightSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  video?: PageVideo | null;
  videoDir?: string;
};

export type CreatePlaywrightSessionOpts = {
  outDir: string;
  headless: boolean;
  viewport: { width: number; height: number };
  recordVideo: boolean;
  enableTracing: boolean;
};

export async function createPlaywrightSession(opts: CreatePlaywrightSessionOpts): Promise<PlaywrightSession> {
  const { chromium } = await import("@playwright/test");

  const browser = await chromium.launch({ headless: opts.headless });
  const videoDir = opts.recordVideo ? path.join(opts.outDir, "video-raw") : undefined;

  const context = await browser.newContext({
    viewport: opts.viewport,
    ...(opts.recordVideo
      ? {
          recordVideo: {
            dir: videoDir!,
            size: opts.viewport,
          },
        }
      : {}),
  });

  if (opts.enableTracing) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }

  const page = await context.newPage();
  const video = page.video?.() ?? null;

  return { browser, context, page, video, videoDir };
}

export async function closePlaywrightSession(
  session: PlaywrightSession,
): Promise<{ videoWebmPath?: string }> {
  // Note: Playwright only finalizes video after the context is closed.
  await session.context.close();

  const videoWebmPath = session.video
    ? await session.video.path().catch(() => undefined)
    : undefined;

  await session.browser.close();
  return { videoWebmPath };
}


