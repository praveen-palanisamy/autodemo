import { chromium } from "@playwright/test";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { defaultAutodemoYamlTemplate } from "../config/templates/autodemoYaml.ts";
import { ScenarioStep } from "../config/schema.ts";
import { installCursorOverlay } from "../utils/cursorOverlay.ts";
import { addRecordingBanner } from "../utils/recordingBanner.ts";
import { mergeScenarioIntoYaml } from "./yamlMerge.ts";
import { normalizeRecordingUrl } from "./normalizeUrl.ts";
import { createLogWriter, createLogWriterAt } from "../utils/logWriter.ts";

type RecordInput = {
  url: string;
  name: string;
  configPath: string;
  cwd: string;
  logPath?: string;
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

export async function recordScenario(
  input: RecordInput,
): Promise<{ scenarioName: string; logPath: string; stepsCount: number }> {
  const normalized = normalizeRecordingUrl(input.url);
  const log = input.logPath ? await createLogWriterAt(input.logPath) : await createLogWriter({ kind: "record", name: input.name });

  await log.write(`Starting interactive record\n`);
  await log.write(`url.input=${input.url}\nurl.full=${normalized.full}\nurl.origin=${normalized.origin}\nurl.path=${normalized.pathAndQuery}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const steps: ScenarioStep[] = [];
  // Start at the exact path the user provided (portable by storing origin separately in project.baseUrl).
  steps.push({ type: "goto", url: normalized.pathAndQuery });

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
  console.log(`Navigate to ${normalized.full} and interact.`);
  console.log("Close the browser window to save and exit. (Recording stays open until you close it.)");
  console.log(`log: ${log.path}`);

  let gotoOk = false;
  try {
    await log.write(`[${new Date().toISOString()}] goto ${normalized.full}\n`);
    await page.goto(normalized.full);
    gotoOk = true;
    await log.write(`[${new Date().toISOString()}] goto ok\n`);
    // Wait until browser is closed (page, context, or browser disconnect).
    await Promise.race([
      page.waitForEvent("close").catch(() => {}),
      context.waitForEvent("close").catch(() => {}),
      new Promise<void>((resolve) => browser.once("disconnected", () => resolve())),
    ]);
  } catch (err) {
    console.error(`Failed to navigate to ${input.url}: ${err instanceof Error ? err.message : String(err)}`);
    console.error("Keeping the browser open — you can manually navigate. Close the browser window to save.");
    await log.write(`[${new Date().toISOString()}] goto failed: ${err instanceof Error ? err.message : String(err)}\n`);
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
    baseUrl: normalized.origin,
  });

  await writeFile(configPathAbs, merged.yamlText, "utf8");
  console.log(
    `Saved scenario '${merged.scenarioName}' to ${input.configPath}${merged.reusedConfig ? " (reused existing config)" : ""}`,
  );
  await log.write(`[${new Date().toISOString()}] saved scenario=${merged.scenarioName} steps=${steps.length}\n`);
  return { scenarioName: merged.scenarioName, logPath: log.path, stepsCount: steps.length };
}

