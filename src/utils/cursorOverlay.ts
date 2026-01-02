import type { Page } from "@playwright/test";

export type CursorOptions = {
  showCursor: boolean;
  style: "arrow" | "hand";
  highlightClicks: boolean;
  clickRadius: number;
};

const OVERLAY_SCRIPT = `
(function() {
  const existing = document.getElementById("__autodemo-cursor");
  if (existing) return;
  const cursor = document.createElement("div");
  cursor.id = "__autodemo-cursor";
  cursor.style.position = "fixed";
  cursor.style.width = "20px";
  cursor.style.height = "20px";
  cursor.style.borderRadius = "50%";
  cursor.style.border = "2px solid rgba(0,0,0,0.5)";
  cursor.style.background = "rgba(255,255,255,0.8)";
  cursor.style.boxShadow = "0 0 8px rgba(0,0,0,0.2)";
  cursor.style.pointerEvents = "none";
  cursor.style.zIndex = "2147483647";
  cursor.style.transform = "translate(-50%, -50%)";
  cursor.style.transition = "transform 60ms linear";
  cursor.style.display = "none";

  const ring = document.createElement("div");
  ring.id = "__autodemo-click-ring";
  ring.style.position = "fixed";
  ring.style.borderRadius = "50%";
  ring.style.border = "2px solid rgba(0, 122, 255, 0.6)";
  ring.style.pointerEvents = "none";
  ring.style.zIndex = "2147483647";
  ring.style.transform = "translate(-50%, -50%)";
  ring.style.display = "none";

  document.documentElement.appendChild(cursor);
  document.documentElement.appendChild(ring);

  let ringTimeout;
  function setCursor(e) {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
    cursor.style.display = "block";
  }
  document.addEventListener("mousemove", setCursor, true);
  function showRing(x, y) {
    if (!window.__autodemoHighlightClicks) return;
    ring.style.left = x + "px";
    ring.style.top = y + "px";
    ring.style.display = "block";
    const baseRadius = window.__autodemoClickRadius || 24;
    ring.style.width = baseRadius * 2 + "px";
    ring.style.height = baseRadius * 2 + "px";
    ring.style.borderColor = window.__autodemoClickColor || "rgba(0, 122, 255, 0.6)";
    ring.style.opacity = "1";
    ring.style.transition = "transform 200ms ease-out, opacity 300ms ease-out";
    ring.style.transform = "translate(-50%, -50%) scale(1.2)";
    clearTimeout(ringTimeout);
    ringTimeout = setTimeout(() => {
      ring.style.opacity = "0";
      ringTimeout = setTimeout(() => {
        ring.style.display = "none";
      }, 200);
    }, 120);
  }

  document.addEventListener("mousemove", setCursor, true);
  document.addEventListener("mousedown", (e) => {
    setCursor(e);
    showRing(e.clientX, e.clientY);
  }, true);

  window.__autodemoCursorMove = function(x, y) {
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
    cursor.style.display = "block";
  };
  window.__autodemoClickRing = function(x, y) {
    showRing(x, y);
  };
})();
`;

export async function installCursorOverlay(page: Page, opts: CursorOptions): Promise<void> {
  if (!opts.showCursor) return;
  await page.addInitScript(`
    window.__autodemoClickRadius = ${opts.clickRadius};
    window.__autodemoHighlightClicks = ${opts.highlightClicks};
    ${OVERLAY_SCRIPT}
    const cursor = document.getElementById("__autodemo-cursor");
    if (cursor) {
      cursor.style.cursor = "${opts.style === "hand" ? "pointer" : "default"}";
    }
  `);
  // Apply immediately on current document
  await page.evaluate(
    ({ style }) => {
      const cursor = document.getElementById("__autodemo-cursor");
      if (cursor) cursor.style.cursor = style === "hand" ? "pointer" : "default";
    },
    { style: opts.style },
  );
}


