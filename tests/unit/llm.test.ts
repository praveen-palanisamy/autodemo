import { describe, expect, test } from "bun:test";

import { resolveLlm } from "../../src/config/llm.ts";

describe("resolveLlm", () => {
  test("returns undefined when nothing configured and no keys present", () => {
    expect(resolveLlm({ env: {} })).toBeUndefined();
  });

  test("auto-detects anthropic first when multiple keys exist", () => {
    const llm = resolveLlm({ env: { ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" } });
    expect(llm?.provider).toBe("anthropic");
    expect(llm?.apiKey).toBe("a");
    expect(llm?.modelName).toBe("anthropic/claude-3-5-haiku-latest");
  });

  test("auto-detects openai from env", () => {
    const llm = resolveLlm({ env: { OPENAI_API_KEY: "sk-x" } });
    expect(llm?.provider).toBe("openai");
    expect(llm?.model).toBe("gpt-4o-mini");
    expect(llm?.source).toBe("auto");
  });

  test("auto-detects google via GEMINI_API_KEY alias", () => {
    const llm = resolveLlm({ env: { GEMINI_API_KEY: "g" } });
    expect(llm?.provider).toBe("google");
    expect(llm?.apiKeyEnv).toBe("GEMINI_API_KEY");
  });

  test("auto-detects ollama from OLLAMA_HOST with OpenAI-compatible baseUrl", () => {
    const llm = resolveLlm({ env: { OLLAMA_HOST: "http://localhost:11434/v1" } });
    expect(llm?.provider).toBe("ollama");
    expect(llm?.baseUrl).toBe("http://localhost:11434/v1");
    expect(llm?.apiKey).toBeUndefined();
  });

  test("config pins provider and custom model", () => {
    const llm = resolveLlm({
      config: { provider: "groq", model: "llama-3.1-8b-instant" },
      env: { GROQ_API_KEY: "gk", OPENAI_API_KEY: "ok" },
    });
    expect(llm?.provider).toBe("groq");
    expect(llm?.model).toBe("llama-3.1-8b-instant");
    expect(llm?.modelName).toBe("groq/llama-3.1-8b-instant");
    expect(llm?.apiKey).toBe("gk");
  });

  test("overrides (CLI flags) beat config and env", () => {
    const llm = resolveLlm({
      config: { provider: "openai" },
      overrides: { provider: "ollama", model: "qwen2.5" },
      env: { OPENAI_API_KEY: "ok", AUTODEMO_LLM_PROVIDER: "google", GOOGLE_API_KEY: "g" },
    });
    expect(llm?.provider).toBe("ollama");
    expect(llm?.model).toBe("qwen2.5");
    expect(llm?.source).toBe("flags");
  });

  test("AUTODEMO_LLM_* env vars beat config", () => {
    const llm = resolveLlm({
      config: { provider: "openai" },
      env: { AUTODEMO_LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "a" },
    });
    expect(llm?.provider).toBe("anthropic");
    expect(llm?.source).toBe("env");
  });

  test("provider inferred from slash-form model", () => {
    const llm = resolveLlm({ config: { model: "anthropic/claude-sonnet-4-5" }, env: { ANTHROPIC_API_KEY: "a" } });
    expect(llm?.provider).toBe("anthropic");
    expect(llm?.model).toBe("claude-sonnet-4-5");
    expect(llm?.modelName).toBe("anthropic/claude-sonnet-4-5");
  });

  test("custom provider uses OpenAI-compatible wire format with baseUrl", () => {
    const llm = resolveLlm({
      config: { provider: "custom", model: "qwen3-coder", baseUrl: "http://localhost:8000/v1" },
      env: { AUTODEMO_LLM_API_KEY: "k" },
    });
    expect(llm?.modelName).toBe("openai/qwen3-coder");
    expect(llm?.baseUrl).toBe("http://localhost:8000/v1");
    expect(llm?.apiKey).toBe("k");
  });

  test("explicit apiKeyEnv wins over provider default", () => {
    const llm = resolveLlm({
      config: { provider: "openai", apiKeyEnv: "MY_KEY" },
      env: { MY_KEY: "mine", OPENAI_API_KEY: "default" },
    });
    expect(llm?.apiKey).toBe("mine");
    expect(llm?.apiKeyEnv).toBe("MY_KEY");
  });
});
