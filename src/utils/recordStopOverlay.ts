import type { BrowserContext, Page } from "@playwright/test";

/**
 * Adds an in-page "Stop & Save" control that calls back into Node to end recording.
 * Uses context-level binding so it works across navigations/pages.
 */
export async function installRecordStopOverlay(opts: {
  context: BrowserContext;
  page: Page;
  onStop: () => void;
}): Promise<void> {
  await opts.context.exposeFunction("__autodemoStopRecording", () => {
    opts.onStop();
  });

  const script = `
    (function() {
      const existing = document.getElementById("__autodemo-rec-controls");
      if (existing) return;
      const wrap = document.createElement("div");
      wrap.id = "__autodemo-rec-controls";
      wrap.style.position = "fixed";
      wrap.style.bottom = "12px";
      wrap.style.right = "12px";
      wrap.style.zIndex = "2147483647";
      wrap.style.display = "flex";
      wrap.style.gap = "10px";
      wrap.style.alignItems = "center";
      wrap.style.font = "13px/16px sans-serif";
      wrap.style.color = "white";
      wrap.style.pointerEvents = "auto";

      const pill = document.createElement("div");
      pill.textContent = "REC";
      pill.style.background = "rgba(220, 38, 38, 0.92)";
      pill.style.padding = "6px 10px";
      pill.style.borderRadius = "999px";
      pill.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";

      const btn = document.createElement("button");
      btn.textContent = "Stop & Save";
      btn.style.background = "rgba(17, 24, 39, 0.92)";
      btn.style.color = "white";
      btn.style.border = "1px solid rgba(255,255,255,0.25)";
      btn.style.padding = "8px 10px";
      btn.style.borderRadius = "10px";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.25)";
      btn.addEventListener("click", () => {
        try { window.__autodemoStopRecording(); } catch {}
      });

      wrap.appendChild(pill);
      wrap.appendChild(btn);
      document.documentElement.appendChild(wrap);
    })();
  `;

  await opts.context.addInitScript(script);
  try {
    await opts.page.evaluate(script);
  } catch {
    // ignore
  }
}


