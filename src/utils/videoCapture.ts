import type { Page } from "@playwright/test";

/**
 * Wait for the page to reach a visually stable state before video frames matter.
 * Keeps timeouts short so CI scenarios don't hang on long-polling apps.
 */
export async function stabilizePageForVideoCapture(page: Page): Promise<void> {
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
  } catch {
    // ignore
  }
  try {
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
  } catch {
    // SPAs often never reach networkidle; a short settle is still useful.
  }
  try {
    await page.evaluate(async () => {
      try {
        await document.fonts?.ready;
      } catch {
        // ignore
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
  } catch {
    // ignore
  }
  await page.waitForTimeout(200);
}

/**
 * Resolve Playwright recordVideo.size. Must match browser.viewport so every frame
 * is captured at the same dimensions (avoids gray padding + jitter on upscale).
 */
export function resolveRecordVideoSize(
  viewport: { width: number; height: number },
  configured?: { width: number; height: number },
): { width: number; height: number } {
  if (
    configured &&
    configured.width === viewport.width &&
    configured.height === viewport.height
  ) {
    return configured;
  }
  // Mismatched record surfaces cause letterboxed WebM and jittery ffmpeg upscale.
  return { width: viewport.width, height: viewport.height };
}
