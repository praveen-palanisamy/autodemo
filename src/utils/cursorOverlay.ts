import type { Page } from "@playwright/test";

export type CursorOptions = {
  showCursor: boolean;
  style: "arrow" | "hand";
  pointerColor?: string; // hex
  clickColor?: string; // hex
  highlightClicks: boolean;
  clickRadius: number;
};

function svgToDataUrl(svg: string): string {
  // Avoid base64; keep it readable and small.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function cursorSvg(style: "arrow" | "hand", color: string): string {
  const fill = color;
  if (style === "hand") {
    // Simple pointer/hand glyph.
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <path fill="${fill}" d="M10 4c1.1 0 2 .9 2 2v8h1V3c0-1.1.9-2 2-2s2 .9 2 2v11h1V5c0-1.1.9-2 2-2s2 .9 2 2v12.5l.6.6c2.2 2.2 3.4 4.2 3.4 6.9V29c0 1.7-1.3 3-3 3H16c-1.1 0-2.1-.6-2.6-1.5l-4.5-7.7c-.4-.7-.4-1.6 0-2.3.6-1 1.9-1.3 2.9-.7l.2.1V6c0-1.1.9-2 2-2z"/>
      </svg>
    `.trim();
  }
  // Arrow/caret cursor.
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <path fill="${fill}" d="M4 2l18 18-6 1.2 2.2 6.8-3.2 1.1-2.2-6.8L8 24 4 2z"/>
    </svg>
  `.trim();
}

const OVERLAY_SCRIPT = `
(function() {
  const existing = document.getElementById("__autodemo-cursor");
  if (existing) return;
  const cursor = document.createElement("div");
  cursor.id = "__autodemo-cursor";
  cursor.style.position = "fixed";
  cursor.style.width = "34px";
  cursor.style.height = "34px";
  cursor.style.backgroundRepeat = "no-repeat";
  cursor.style.backgroundSize = "contain";
  cursor.style.backgroundPosition = "center";
  cursor.style.pointerEvents = "none";
  cursor.style.zIndex = "2147483647";
  cursor.style.transform = "translate(-50%, -50%)";
  cursor.style.display = "block";
  cursor.style.left = "24px";
  cursor.style.top = "24px";

  const ring = document.createElement("div");
  ring.id = "__autodemo-click-ring";
  ring.style.position = "fixed";
  ring.style.borderRadius = "50%";
  ring.style.border = "2px solid rgba(0, 122, 255, 0.8)";
  ring.style.pointerEvents = "none";
  ring.style.zIndex = "2147483647";
  ring.style.transform = "translate(-50%, -50%)";
  ring.style.display = "none";

  document.documentElement.appendChild(cursor);
  document.documentElement.appendChild(ring);

  let ringTimeout;
  function setCursorXY(x, y) {
    cursor.style.left = x + "px";
    cursor.style.top = y + "px";
  }
  document.addEventListener("mousemove", (e) => setCursorXY(e.clientX, e.clientY), true);
  function showRing(x, y) {
    if (!window.__autodemoHighlightClicks) return;
    ring.style.left = x + "px";
    ring.style.top = y + "px";
    ring.style.display = "block";
    const baseRadius = window.__autodemoClickRadius || 28;
    ring.style.width = baseRadius * 2 + "px";
    ring.style.height = baseRadius * 2 + "px";
    ring.style.borderColor = window.__autodemoClickColor || "rgba(0, 122, 255, 0.8)";
    ring.style.opacity = "1";
    ring.style.transition = "transform 240ms ease-out, opacity 420ms ease-out";
    ring.style.transform = "translate(-50%, -50%) scale(1.35)";
    clearTimeout(ringTimeout);
    ringTimeout = setTimeout(() => {
      ring.style.opacity = "0";
      ringTimeout = setTimeout(() => {
        ring.style.display = "none";
      }, 250);
    }, 420);
  }

  document.addEventListener("mousedown", (e) => {
    setCursorXY(e.clientX, e.clientY);
    showRing(e.clientX, e.clientY);
  }, true);

  window.__autodemoCursorMove = function(x, y) {
    setCursorXY(x, y);
  };
  window.__autodemoClickRing = function(x, y) {
    showRing(x, y);
  };
})();
`;

export async function installCursorOverlay(page: Page, opts: CursorOptions): Promise<void> {
  if (!opts.showCursor) return;
  const pointerColor = opts.pointerColor ?? "#0076FF";
  const clickColor = opts.clickColor ?? pointerColor;
  const svg = cursorSvg(opts.style, pointerColor);
  const dataUrl = svgToDataUrl(svg);
  const script = `
    window.__autodemoClickRadius = ${opts.clickRadius};
    window.__autodemoHighlightClicks = ${opts.highlightClicks};
    window.__autodemoClickColor = ${JSON.stringify(clickColor)};
    ${OVERLAY_SCRIPT}
    const cursor = document.getElementById("__autodemo-cursor");
    if (cursor) {
      cursor.style.backgroundImage = 'url("${dataUrl}")';
    }
  `;
  await page.addInitScript(script);
  // Apply immediately on the current document so the first page also gets the overlay.
  await page.evaluate(script);
  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      try {
        await page.evaluate(script);
      } catch {
        // ignore
      }
    }
  });
}


