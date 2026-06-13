import type { Page } from "@playwright/test";

import { BRAND } from "./constants.ts";

const WATERMARK_SCRIPT = `
(function() {
  const label = ${JSON.stringify(`${BRAND.name} · ${BRAND.productSiteUrl}`)};
  const href = ${JSON.stringify(BRAND.productSiteUrl)};

  function ensure() {
    if (document.getElementById("__autodemo-brand-watermark")) return;
    const el = document.createElement("a");
    el.id = "__autodemo-brand-watermark";
    el.href = href;
    el.target = "_blank";
    el.rel = "noopener";
    el.textContent = label;
    el.style.all = "initial";
    el.style.position = "fixed";
    el.style.left = "14px";
    el.style.bottom = "14px";
    el.style.padding = "6px 10px";
    el.style.borderRadius = "8px";
    el.style.background = "rgba(8, 7, 16, 0.72)";
    el.style.color = "#ffffff";
    el.style.font = "600 12px/1.2 ui-sans-serif, system-ui, sans-serif";
    el.style.textDecoration = "none";
    el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.28)";
    el.style.zIndex = "2147483645";
    el.style.pointerEvents = "auto";
    el.style.maxWidth = "min(420px, calc(100vw - 28px))";
    el.style.whiteSpace = "nowrap";
    el.style.overflow = "hidden";
    el.style.textOverflow = "ellipsis";
    (document.body || document.documentElement).appendChild(el);
  }

  ensure();
  document.addEventListener("DOMContentLoaded", ensure, { once: true });
  try {
    const obs = new MutationObserver(() => ensure());
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch {}
})();
`;

/** Subtle on-screen attribution during video capture (omitted when output.branding is false). */
export async function installBrandingWatermark(page: Page): Promise<void> {
  await page.addInitScript(WATERMARK_SCRIPT);
  await page.evaluate(WATERMARK_SCRIPT).catch(() => {});
}
