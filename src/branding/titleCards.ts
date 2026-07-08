import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

export type TitleCardOpts = {
  title: string;
  subtitle?: string;
  footer?: string;
  background: string;
  textColor: string;
  /** Local logo image path, inlined as a data URI. */
  logoPath?: string;
};

const LOGO_MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function logoDataUri(logoPath: string): Promise<string | undefined> {
  const mime = LOGO_MIME[path.extname(logoPath).toLowerCase()];
  if (!mime) return undefined;
  try {
    const buf = await readFile(logoPath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleCardHtml(opts: TitleCardOpts, logoSrc?: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  body {
    background: ${opts.background};
    color: ${opts.textColor};
    display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .card { text-align: center; max-width: 72%; }
  .logo { max-height: 96px; max-width: 320px; margin-bottom: 40px; }
  h1 { font-size: 56px; font-weight: 700; line-height: 1.15; margin: 0 0 20px; letter-spacing: -0.02em; }
  p.subtitle { font-size: 26px; font-weight: 400; opacity: 0.82; margin: 0; line-height: 1.4; }
  p.footer { font-size: 18px; font-weight: 500; opacity: 0.6; margin: 44px 0 0; }
</style></head>
<body>
  <div class="card">
    ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="">` : ""}
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
    ${opts.footer ? `<p class="footer">${escapeHtml(opts.footer)}</p>` : ""}
  </div>
</body>
</html>`;
}

/**
 * Render a title card as a viewport-sized PNG using the live browser page.
 * Must run before the Playwright session closes; the page is navigated away
 * from the app, so only call after all scenario steps have executed.
 */
export async function renderTitleCardPng(opts: {
  page: Page;
  outPath: string;
  card: TitleCardOpts;
}): Promise<void> {
  const logoSrc = opts.card.logoPath ? await logoDataUri(opts.card.logoPath) : undefined;
  await opts.page.setContent(titleCardHtml(opts.card, logoSrc), { waitUntil: "load" });
  await opts.page.screenshot({ path: opts.outPath, fullPage: false });
}
