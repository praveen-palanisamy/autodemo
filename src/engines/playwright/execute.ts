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

  async function moveCursor(x: number, y: number, highlight: boolean) {
    try {
      await page.mouse.move(x, y, { steps: 8 });
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
        await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
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
      await loc.click();
      return;
    }
    case "fill": {
      const loc = locatorFor(step.selector);
      await moveToSelectorCenter(step.selector, false);
      await loc.fill(step.value);
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
        await moveToSelectorCenter(step.selector, false);
        await loc.click();
      }
      await page.keyboard.press(step.key);
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
        throw new Error(`Expected text '${step.text}' in '${step.selector}', got: ${JSON.stringify(txt)}`);
      }
      return;
    }
    case "sleep": {
      await new Promise((r) => setTimeout(r, step.ms));
      return;
    }
    // Stagehand-only steps are not executed here.
    case "act":
      throw new Error("Internal error: 'act' step routed to Playwright executor");
    default:
      assertNever(step);
  }
}


