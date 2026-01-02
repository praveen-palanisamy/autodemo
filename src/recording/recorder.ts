import { chromium } from "@playwright/test";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { defaultAutodemoYamlTemplate } from "../config/templates/autodemoYaml.ts";
import { ScenarioStep } from "../config/schema.ts";
import { installCursorOverlay } from "../utils/cursorOverlay.ts";
import { addRecordingBanner } from "../utils/recordingBanner.ts";
import { mergeScenarioIntoYaml } from "./yamlMerge.ts";

type RecordInput = {
  url: string;
  name: string;
  configPath: string;
  cwd: string;
};

// Simple selector generator (id > class > tag path)
const SELECTOR_GENERATOR = `
(function() {
  function getSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) return '.' + classes.join('.');
    }
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let tag = el.tagName.toLowerCase();
      if (el.id) {
        path.unshift('#' + el.id);
        break;
      }
      let sibling = el;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.tagName.toLowerCase() === tag) nth++;
      }
      if (nth > 1) tag += ':nth-of-type(' + nth + ')';
      path.unshift(tag);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  document.addEventListener('click', (e) => {
    const sel = getSelector(e.target);
    window.__logAction({ type: 'click', selector: sel });
  }, true);

  document.addEventListener('change', (e) => {
    const sel = getSelector(e.target);
    // For now, assume fill if it's an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
       window.__logAction({ type: 'fill', selector: sel, value: e.target.value });
    }
  }, true);
})();
`;

export async function recordScenario(input: RecordInput): Promise<void> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const steps: ScenarioStep[] = [];
  steps.push({ type: "goto", url: "/" }); // Start with root relative to baseUrl

  try {
    await installCursorOverlay(page, {
      showCursor: true,
      style: "arrow",
      highlightClicks: true,
      clickRadius: 24,
    });
  } catch {
    // best-effort
  }

  try {
    await addRecordingBanner(page, {
      message: "Recording with autodemo — close the browser window to save",
    });
  } catch {
    // best-effort
  }

  // Expose binding to capture events from browser
  await page.exposeFunction(
    "__logAction",
    (action: { type: string; selector?: string; value?: string | number | null }) => {
      if (action.type === "click" && action.selector) {
        steps.push({ type: "click", selector: action.selector });
      } else if (action.type === "fill" && action.selector) {
        steps.push({ type: "fill", selector: action.selector, value: String(action.value ?? "") });
      }
    },
  );

  await page.addInitScript(SELECTOR_GENERATOR);

  console.log(`Recording scenario '${input.name}'...`);
  console.log(`Navigate to ${input.url} and interact.`);
  console.log("Close the browser window to save and exit. (Recording stays open until you close it.)");

  let gotoOk = false;
  try {
    await page.goto(input.url);
    gotoOk = true;
    // Wait until browser is closed (page, context, or browser disconnect).
    await Promise.race([
      page.waitForEvent("close").catch(() => {}),
      context.waitForEvent("close").catch(() => {}),
      new Promise<void>((resolve) => browser.once("disconnected", () => resolve())),
    ]);
  } catch (err) {
    console.error(`Failed to navigate to ${input.url}: ${err instanceof Error ? err.message : String(err)}`);
    console.error("Keeping the browser open — you can manually navigate. Close the browser window to save.");
    await Promise.race([
      page.waitForEvent("close").catch(() => {}),
      context.waitForEvent("close").catch(() => {}),
      new Promise<void>((resolve) => browser.once("disconnected", () => resolve())),
    ]);
  } finally {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }

  // Save
  const configPathAbs = path.isAbsolute(input.configPath)
    ? input.configPath
    : path.join(input.cwd, input.configPath);

  const yamlText = existsSync(configPathAbs)
    ? await readFile(configPathAbs, "utf8")
    : defaultAutodemoYamlTemplate();

  const merged = mergeScenarioIntoYaml({
    yamlText,
    scenarioName: input.name,
    description: `Recorded interactively${gotoOk ? "" : " (manual navigation)"}`,
    steps,
    baseUrl: input.url,
  });

  await writeFile(configPathAbs, merged.yamlText, "utf8");
  console.log(
    `Saved scenario '${merged.scenarioName}' to ${input.configPath}${merged.reusedConfig ? " (reused existing config)" : ""}`,
  );
}

