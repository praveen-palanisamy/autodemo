import type { Page } from "@playwright/test";

const DEV_OVERLAY_STYLE = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dialog-overlay],
  [data-nextjs-dialog],
  [data-nextjs-error-overlay],
  [data-nextjs-dev-tools-button],
  [data-nextjs-dev-tools-panel],
  [data-vite-dev-id],
  #webpack-dev-server-client-overlay,
  iframe[src*="webpack-dev-server"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/** Pause embedded <video> and show poster only — avoids nested demo videos in captures. */
const HOLD_EMBEDDED_VIDEO_SCRIPT = `
(function() {
  function holdEmbeddedVideos() {
    for (const video of document.querySelectorAll("video")) {
      try {
        video.pause();
        if (video.dataset.autodemoAllowPlayback === "true") continue;
        const poster = video.getAttribute("poster");
        if (video.getAttribute("src")) {
          if (!video.dataset.autodemoOriginalSrc) {
            video.dataset.autodemoOriginalSrc = video.getAttribute("src") || "";
          }
          video.removeAttribute("src");
          video.load();
        }
        if (poster) video.setAttribute("poster", poster);
      } catch {
        // ignore per-element failures
      }
    }
  }
  holdEmbeddedVideos();
  document.addEventListener("DOMContentLoaded", holdEmbeddedVideos, { once: true });
  window.addEventListener("load", holdEmbeddedVideos, { once: true });
})();
`;

const SCRIPT = `
(function() {
  function installAutodemoCaptureGuards() {
    if (document.getElementById("__autodemo-capture-guards")) return;
    const style = document.createElement("style");
    style.id = "__autodemo-capture-guards";
    style.textContent = ${JSON.stringify(DEV_OVERLAY_STYLE)};
    (document.head || document.documentElement).appendChild(style);
  }

  installAutodemoCaptureGuards();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installAutodemoCaptureGuards, { once: true });
  }
  window.addEventListener("load", installAutodemoCaptureGuards, { once: true });
})();
`;

export async function installCaptureGuards(
  page: Page,
  opts?: { holdEmbeddedVideos?: boolean },
): Promise<void> {
  await page.addInitScript(SCRIPT);
  await page.evaluate(SCRIPT).catch(() => {});
  if (opts?.holdEmbeddedVideos) {
    await page.addInitScript(HOLD_EMBEDDED_VIDEO_SCRIPT);
    await page.evaluate(HOLD_EMBEDDED_VIDEO_SCRIPT).catch(() => {});
  }
  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      await page.evaluate(SCRIPT).catch(() => {});
      if (opts?.holdEmbeddedVideos) {
        await page.evaluate(HOLD_EMBEDDED_VIDEO_SCRIPT).catch(() => {});
      }
    }
  });
}
