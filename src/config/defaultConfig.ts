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
      headless: true,
      viewport: { width: 1440, height: 900 },
      recordVideo: false,
    },
    stagehand: {
      mode: "local",
      browserbaseApiKeyEnv: "BROWSERBASE_API_KEY",
    },
    scenarios: {},
  };
}


