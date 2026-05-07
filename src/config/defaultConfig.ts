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
    llm: {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKeyEnv: "OPENAI_API_KEY",
    },
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
