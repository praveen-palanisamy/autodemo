import type { Page, Locator } from "@playwright/test";
import type { ScenarioStep } from "../../config/schema.ts";
import { resolveUrl } from "../../utils/url.ts";

function assertNever(x: never): never {
  throw new Error(`Unsupported step: ${JSON.stringify(x)}`);
}

export async function executePlaywrightStep(opts: {
  page: Page;
  baseUrl: string;
  step: ScenarioStep;
}): Promise<void> {
  const { page, baseUrl, step } = opts;

  const locatorFor = (selector: string): Locator => page.locator(selector).first();
  const wait = (ms: number) => page.waitForTimeout(ms);

  async function waitForPageToSettle() {
    try {
      await page.waitForLoadState("load", { timeout: 30_000 });
    } catch {
      // Some apps keep streaming work alive; a short visual settle is still useful for video.
    }
    await wait(250);
  }

  async function moveCursor(x: number, y: number, highlight: boolean) {
    try {
      await page.mouse.move(x, y, { steps: 18 });
    } catch {
      // ignore
    }
    try {
      await page.evaluate(
        ({ x, y, highlight }) => {
          // @ts-expect-error injected by cursor overlay
          if (window.__autodemoCursorMove) window.__autodemoCursorMove(x, y);
          // @ts-expect-error injected by cursor overlay
          if (highlight && window.__autodemoClickRing) window.__autodemoClickRing(x, y);
        },
        { x, y, highlight },
      );
    } catch {
      // ignore
    }
    await wait(highlight ? 260 : 180);
  }

  async function moveToSelectorCenter(selector: string, highlight: boolean) {
    const box = await locatorFor(selector).boundingBox();
    if (!box) return;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await moveCursor(x, y, highlight);
  }

  switch (step.type) {
    case "goto": {
      const targetUrl = resolveUrl(baseUrl, step.url);
      try {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await waitForPageToSettle();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ECONNREFUSED")) {
          throw new Error(
            `goto: could not connect to ${targetUrl}. Is your app running? ` +
              `Start it (e.g. Next.js: \`bunx next dev --turbo\`) or pass \`--url\` / set project.baseUrl.`,
          );
        }
        throw err;
      }
      return;
    }
    case "click": {
      const loc = locatorFor(step.selector);
      await moveToSelectorCenter(step.selector, true);
      await wait(240);
      await loc.click();
      await wait(520);
      return;
    }
    case "fill": {
      const loc = locatorFor(step.selector);
      await moveToSelectorCenter(step.selector, false);
      await loc.click();
      if (step.typing) {
        await loc.fill("");
        await loc.pressSequentially(step.value, { delay: step.delayMs ?? 45 });
      } else {
        await loc.fill(step.value);
      }
      await wait(step.typing ? 650 : 320);
      return;
    }
    case "hover": {
      const loc = locatorFor(step.selector);
      await moveToSelectorCenter(step.selector, false);
      await loc.hover();
      return;
    }
    case "press": {
      if (step.selector) {
        const loc = locatorFor(step.selector);
        await moveToSelectorCenter(step.selector, true);
        await loc.click();
        await wait(220);
      }
      await page.keyboard.press(step.key);
      await wait(520);
      return;
    }
    case "select": {
      const loc = locatorFor(step.selector);
      await moveToSelectorCenter(step.selector, false);
      await loc.selectOption(step.values.map((v) => ({ value: v })));
      return;
    }
    case "waitForSelector": {
      const loc = locatorFor(step.selector);
      await loc.waitFor({ state: "visible", timeout: step.timeoutMs });
      return;
    }
    case "waitFor": {
      const loc = page.locator(`text=${step.text}`);
      await loc.first().waitFor({ state: "visible", timeout: step.timeoutMs });
      return;
    }
    case "expectVisible": {
      await page.locator(step.selector).waitFor({ state: "visible", timeout: step.timeoutMs });
      return;
    }
    case "expectText": {
      const loc = page.locator(step.selector);
      await loc.first().waitFor({ state: "visible", timeout: 10_000 });
      const txt = (await loc.first().textContent()) ?? "";
      if (!txt.includes(step.text)) {
        throw new Error(
          `Expected text '${step.text}' in '${step.selector}', got: ${JSON.stringify(txt)}`,
        );
      }
      return;
    }
    case "sleep": {
      await new Promise((r) => setTimeout(r, step.ms));
      return;
    }
    case "scrollTo": {
      try {
        const behavior = step.behavior ?? "auto";
        if (behavior === "smooth") {
          await page.evaluate(
            ({ y, durationMs }) =>
              new Promise<void>((resolve) => {
                const startY = window.scrollY;
                const delta = y - startY;
                const start = performance.now();
                const ease = (t: number) => 1 - Math.pow(1 - t, 3);
                function frame(now: number) {
                  const elapsed = Math.min(1, (now - start) / durationMs);
                  window.scrollTo(0, Math.round(startY + delta * ease(elapsed)));
                  if (elapsed < 1) requestAnimationFrame(frame);
                  else resolve();
                }
                requestAnimationFrame(frame);
              }),
            { y: step.y, durationMs: step.durationMs ?? 900 },
          );
        } else {
          await page.evaluate((y) => window.scrollTo(0, y), step.y);
        }
      } catch {
        // ignore
      }
      return;
    }
    case "scrollIntoView": {
      await locatorFor(step.selector).scrollIntoViewIfNeeded();
      await page.evaluate(
        ({ selector, behavior, block }) => {
          document.querySelector(selector)?.scrollIntoView({ behavior, block });
        },
        {
          selector: step.selector,
          behavior: step.behavior ?? "smooth",
          block: step.block ?? "center",
        },
      );
      await wait((step.behavior ?? "smooth") === "smooth" ? 1000 : 220);
      return;
    }
    case "narrate": {
      await page.evaluate(
        ({ text, ms }) =>
          new Promise<void>((resolve) => {
            const existing = document.getElementById("__autodemo-narration");
            existing?.remove();
            const el = document.createElement("div");
            el.id = "__autodemo-narration";
            el.textContent = text;
            el.style.position = "fixed";
            el.style.left = "50%";
            el.style.bottom = "32px";
            el.style.transform = "translateX(-50%)";
            el.style.maxWidth = "min(960px, calc(100vw - 64px))";
            el.style.padding = "14px 18px";
            el.style.borderRadius = "18px";
            el.style.background = "rgba(8, 7, 16, 0.86)";
            el.style.color = "#ffffff";
            el.style.font =
              "600 22px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
            el.style.textAlign = "center";
            el.style.boxShadow = "0 18px 60px rgba(0, 0, 0, 0.35)";
            el.style.zIndex = "2147483646";
            el.style.opacity = "0";
            el.style.transition = "opacity 180ms ease-out, transform 180ms ease-out";
            document.body.appendChild(el);
            requestAnimationFrame(() => {
              el.style.opacity = "1";
            });
            setTimeout(() => {
              el.style.opacity = "0";
              setTimeout(() => {
                el.remove();
                resolve();
              }, 220);
            }, ms);
          }),
        { text: step.text, ms: step.ms ?? 1800 },
      );
      return;
    }
    case "screenshot":
      return;
    // Stagehand-only steps are not executed here.
    case "act":
      throw new Error("Internal error: 'act' step routed to Playwright executor");
    default:
      assertNever(step);
  }
}
