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
import { buildSelectorAndNote, type RecordedElementInfo } from "./selector.ts";
import { installRecordStopOverlay } from "../utils/recordStopOverlay.ts";

type RecordInput = {
  url: string;
  name: string;
  configPath: string;
  cwd: string;
  logPath?: string;
  signal?: AbortSignal;
};

// Capture element metadata; we build robust selectors on the Node side.
const SELECTOR_GENERATOR = `
(function() {
  function getLabelText(el) {
    try {
      if (!el) return null;
      // <label><input/></label>
      if (el.closest) {
        const parentLabel = el.closest('label');
        if (parentLabel) return (parentLabel.innerText || parentLabel.textContent || '').trim();
      }
      // <label for="id">
      if (el.id) {
        const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (label) return (label.innerText || label.textContent || '').trim();
      }
    } catch {}
    return null;
  }

  function info(el) {
    const tag = (el.tagName || 'div').toLowerCase();
    const idAttr = el.getAttribute && el.getAttribute('id');
    const testId = el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test'));
    const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    const nameAttr = el.getAttribute && el.getAttribute('name');
    const placeholder = el.getAttribute && el.getAttribute('placeholder');
    const role = el.getAttribute && el.getAttribute('role');
    const href = tag === 'a' && el.getAttribute ? el.getAttribute('href') : null;
    const inputType = el.getAttribute && el.getAttribute('type');
    const text = (el.innerText || el.textContent || '').trim();
    const labelText = getLabelText(el);
    return { tag, idAttr, testId, ariaLabel, nameAttr, placeholder, role, href, inputType, text, labelText };
  }

  document.addEventListener('click', (e) => {
    window.__logAction({ type: 'click', el: info(e.target) });
  }, true);

  document.addEventListener('change', (e) => {
    // For now, assume fill if it's an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
       window.__logAction({ type: 'fill', el: info(e.target), value: e.target.value });
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
  // If the app opens a new page during auth/redirect, keep recording (don't stop).
  context.on("page", (p) => {
    void log.write(`[${new Date().toISOString()}] new page url=${p.url()}\n`);
    p.on("close", () => {
      void log.write(`[${new Date().toISOString()}] page close url=${p.url()}\n`);
      try {
        if (context.pages().length === 0) stop("all_pages_closed");
      } catch {
        // ignore
      }
    });
  });
  let lastUrl = "about:blank";
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      lastUrl = frame.url();
      void log.write(`[${new Date().toISOString()}] navigated ${lastUrl}\n`);
    }
  });
  page.on("close", () => {
    void log.write(`[${new Date().toISOString()}] page close url=${lastUrl}\n`);
    try {
      if (context.pages().length === 0) stop("all_pages_closed");
    } catch {
      // ignore
    }
  });
  page.on("crash", () => void log.write(`[${new Date().toISOString()}] page crash url=${lastUrl}\n`));
  context.on("close", () => void log.write(`[${new Date().toISOString()}] context close\n`));
  browser.on("disconnected", () => void log.write(`[${new Date().toISOString()}] browser disconnected\n`));

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

  let stopReason: string | undefined;
  let resolveStop: (() => void) | undefined;
  const stopPromise = new Promise<void>((resolve) => {
    resolveStop = resolve;
  });
  const stop = (reason: string) => {
    if (stopReason) return;
    stopReason = reason;
    resolveStop?.();
  };

  // Expose binding to capture events from browser (context-scoped so it survives page changes).
  await context.exposeFunction(
    "__logAction",
    (action: unknown) => {
      try {
        const a = action as { type?: string; el?: unknown; value?: unknown };
        if (a?.type === "click" && a.el && typeof a.el === "object") {
          const { selector, note } = buildSelectorAndNote({ type: "click", el: a.el as RecordedElementInfo });
          steps.push({ type: "click", selector, ...(note ? { note } : {}) });
          void log.write(`[${new Date().toISOString()}] click selector=${selector} note=${note ?? ""}\n`);
        } else if (a?.type === "fill" && a.el && typeof a.el === "object") {
          const { selector, note } = buildSelectorAndNote({
            type: "fill",
            el: a.el as RecordedElementInfo,
            value: String(a.value ?? ""),
          });
          steps.push({ type: "fill", selector, value: String(a.value ?? ""), ...(note ? { note } : {}) });
          void log.write(`[${new Date().toISOString()}] fill selector=${selector} note=${note ?? ""}\n`);
        }
      } catch (e) {
        void log.write(`[${new Date().toISOString()}] ERROR building selector: ${e instanceof Error ? e.message : String(e)}\n`);
      }
    },
  );

  await context.addInitScript(SELECTOR_GENERATOR);

  // Stop overlay (works across navigations/pages).
  await installRecordStopOverlay({
    context,
    page,
    onStop: () => stop("stop_button"),
  });

  const onSigint = () => stop("sigint");
  process.on("SIGINT", onSigint);
  browser.on("disconnected", () => stop("browser_closed"));
  context.on("close", () => stop("context_closed"));
  if (input.signal) {
    if (input.signal.aborted) stop("sigint");
    else input.signal.addEventListener("abort", () => stop("sigint"), { once: true });
  }

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
    // Wait until user stops recording: browser close, stop button, or Ctrl+C.
    await stopPromise;
  } catch (err) {
    console.error(`Failed to navigate to ${input.url}: ${err instanceof Error ? err.message : String(err)}`);
    console.error("Keeping the browser open — you can manually navigate. Close the browser window to save.");
    await log.write(`[${new Date().toISOString()}] goto failed: ${err instanceof Error ? err.message : String(err)}\n`);
    // Keep running until stop condition.
    await stopPromise;
  } finally {
    try {
      process.off("SIGINT", onSigint);
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
  await log.write(
    `[${new Date().toISOString()}] stopReason=${stopReason ?? "unknown"} saved scenario=${merged.scenarioName} steps=${steps.length}\n`,
  );
  return { scenarioName: merged.scenarioName, logPath: log.path, stepsCount: steps.length };
}

