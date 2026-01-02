import type { Page } from "@playwright/test";
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
      await page.click(step.selector);
      return;
    }
    case "fill": {
      await page.fill(step.selector, step.value);
      return;
    }
    case "hover": {
      await page.hover(step.selector);
      return;
    }
    case "press": {
      if (step.selector) {
        await page.click(step.selector);
      }
      await page.keyboard.press(step.key);
      return;
    }
    case "select": {
      await page.selectOption(step.selector, step.values.map((v) => ({ value: v })));
      return;
    }
    case "waitForSelector": {
      await page.waitForSelector(step.selector, { timeout: step.timeoutMs });
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


