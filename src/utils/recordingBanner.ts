import type { Page } from "@playwright/test";

export async function addRecordingBanner(page: Page, opts: { message: string }): Promise<void> {
  await page.addInitScript(
    `
    (function() {
      const existing = document.getElementById("__autodemo-rec-banner");
      if (existing) return;
      const banner = document.createElement("div");
      banner.id = "__autodemo-rec-banner";
      banner.textContent = ${JSON.stringify(opts.message)};
      banner.style.position = "fixed";
      banner.style.top = "12px";
      banner.style.right = "12px";
      banner.style.padding = "10px 14px";
      banner.style.background = "rgba(220, 38, 38, 0.92)";
      banner.style.color = "white";
      banner.style.font = "14px/18px sans-serif";
      banner.style.borderRadius = "8px";
      banner.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
      banner.style.zIndex = "2147483647";
      banner.style.pointerEvents = "none";
      document.documentElement.appendChild(banner);
    })();
  `,
  );
}


