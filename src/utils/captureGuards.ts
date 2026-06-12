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

export async function installCaptureGuards(page: Page): Promise<void> {
  await page.addInitScript(SCRIPT);
  await page.evaluate(SCRIPT).catch(() => {});
  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      await page.evaluate(SCRIPT).catch(() => {});
    }
  });
}
