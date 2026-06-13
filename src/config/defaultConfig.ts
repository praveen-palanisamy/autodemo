export function defaultConfig(): Record<string, unknown> {
  return {
    project: {
      name: "MyApp",
      baseUrl: "http://localhost:3000",
    },
    output: {
      dir: "public/demos",
      clean: true,
    },
    // llm is intentionally omitted: AutoDemo auto-detects the provider from
    // well-known env vars (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY,
    // GROQ_API_KEY, OLLAMA_HOST). Add an `llm:` section to pin one explicitly.
    browser: {
      headless: false,
      viewport: { width: 1600, height: 900 },
      recordVideo: false,
      cursor: {
        showCursor: true,
        style: "arrow",
        pointerColor: "#0076FF",
        clickColor: "#0076FF",
        highlightClicks: true,
        clickRadius: 36,
      },
      transitions: {
        transitionMs: 800,
        endPauseMs: 1200,
      },
      capture: {
        hideDevOverlays: true,
      },
      video: {
        // source: "frames" (default) | "playwright"
        trimStartBeforeMs: 600,
      },
    },
    recording: {
      events: ["click", "fill", "scroll"],
      scrollThrottleMs: 300,
    },
    stagehand: {
      mode: "local",
      browserbaseApiKeyEnv: "BROWSERBASE_API_KEY",
    },
    scenarios: {},
  };
}
