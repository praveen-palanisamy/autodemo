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

export async function createPlaywrightSessionFromCdp(opts: {
  cdpUrl: string;
  viewport: { width: number; height: number };
  enableTracing: boolean;
}): Promise<PlaywrightSession> {
  const { chromium } = await import("@playwright/test");

  const maxMs = 45000;
  const start = Date.now();
  let lastErr: unknown;
  let browser: Browser | undefined;

  while (!browser && Date.now() - start < maxMs) {
    try {
      browser = await chromium.connectOverCDP(opts.cdpUrl);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!browser) {
    throw new Error(
      `Failed to connect to Stagehand browser over CDP (${opts.cdpUrl}). ` +
        `Is Stagehand running and reachable? ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    );
  }

  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());

  // Best-effort normalize viewport for screenshots.
  try {
    await page.setViewportSize(opts.viewport);
  } catch {
    // ignore
  }

  if (opts.enableTracing) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }

  return { browser, context, page, video: null, videoDir: undefined };
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


