export type LlmProvider = "openai" | "anthropic" | "google" | "groq" | "ollama" | "custom";

export type LlmConfigInput = {
  provider?: LlmProvider;
  model?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
};

export type ResolvedLlm = {
  provider: LlmProvider;
  /** Bare model id, e.g. "gpt-4o-mini". */
  model: string;
  /** Stagehand-style model name, e.g. "openai/gpt-4o-mini". */
  modelName: string;
  apiKey?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  /** Where the choice came from (helps doctor + debug output). */
  source: "flags" | "config" | "env" | "auto";
};

type ProviderDefaults = {
  model: string;
  apiKeyEnv?: string;
  /** Additional env var names accepted for the API key. */
  altApiKeyEnvs?: string[];
  baseUrl?: (env: Record<string, string | undefined>) => string | undefined;
};

export const PROVIDER_DEFAULTS: Record<LlmProvider, ProviderDefaults> = {
  openai: { model: "gpt-4o-mini", apiKeyEnv: "OPENAI_API_KEY" },
  anthropic: { model: "claude-3-5-haiku-latest", apiKeyEnv: "ANTHROPIC_API_KEY" },
  google: {
    model: "gemini-2.0-flash",
    apiKeyEnv: "GOOGLE_API_KEY",
    altApiKeyEnvs: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
  },
  groq: { model: "llama-3.3-70b-versatile", apiKeyEnv: "GROQ_API_KEY" },
  ollama: {
    // Any model pulled locally works; this is just a sensible default.
    model: "llama3.3",
    baseUrl: (env) => env.OLLAMA_HOST ?? "http://localhost:11434/v1",
  },
  custom: { model: "", apiKeyEnv: "AUTODEMO_LLM_API_KEY" },
};

/** Detection order when nothing is configured: first provider with a key wins. */
const AUTO_DETECT_ORDER: LlmProvider[] = ["anthropic", "openai", "google", "groq", "ollama"];

function findApiKey(
  provider: LlmProvider,
  env: Record<string, string | undefined>,
  explicitEnvName?: string,
): { apiKey?: string; apiKeyEnv?: string } {
  const defaults = PROVIDER_DEFAULTS[provider];
  const candidates = [
    ...(explicitEnvName ? [explicitEnvName] : []),
    ...(defaults.apiKeyEnv ? [defaults.apiKeyEnv] : []),
    ...(defaults.altApiKeyEnvs ?? []),
  ];
  for (const name of candidates) {
    const value = env[name];
    if (value) return { apiKey: value, apiKeyEnv: name };
  }
  return { apiKeyEnv: explicitEnvName ?? defaults.apiKeyEnv };
}

/**
 * Resolve the LLM used for AI (`act`) steps.
 *
 * Precedence: explicit overrides (CLI flags) > AUTODEMO_LLM_* env vars >
 * `.autodemo.yml` `llm:` section > auto-detection from well-known API key env vars.
 *
 * Returns undefined when nothing is configured or detectable; deterministic
 * scenarios run fine without any LLM.
 */
export function resolveLlm(opts: {
  config?: LlmConfigInput;
  overrides?: LlmConfigInput;
  env?: Record<string, string | undefined>;
}): ResolvedLlm | undefined {
  const env = opts.env ?? process.env;

  const envInput: LlmConfigInput = {
    provider: env.AUTODEMO_LLM_PROVIDER as LlmProvider | undefined,
    model: env.AUTODEMO_LLM_MODEL,
    apiKeyEnv: env.AUTODEMO_LLM_API_KEY_ENV,
    baseUrl: env.AUTODEMO_LLM_BASE_URL,
  };

  const merged: LlmConfigInput = {
    provider: opts.overrides?.provider ?? envInput.provider ?? opts.config?.provider,
    model: opts.overrides?.model ?? envInput.model ?? opts.config?.model,
    apiKeyEnv: opts.overrides?.apiKeyEnv ?? envInput.apiKeyEnv ?? opts.config?.apiKeyEnv,
    baseUrl: opts.overrides?.baseUrl ?? envInput.baseUrl ?? opts.config?.baseUrl,
  };

  let provider = merged.provider;
  let source: ResolvedLlm["source"] = opts.overrides?.provider
    ? "flags"
    : envInput.provider
      ? "env"
      : opts.config?.provider
        ? "config"
        : "auto";

  // A bare model like "anthropic/claude-..." implies its provider.
  if (!provider && merged.model?.includes("/")) {
    const prefix = merged.model.split("/")[0] as LlmProvider;
    if (prefix in PROVIDER_DEFAULTS) provider = prefix;
  }

  if (!provider) {
    for (const candidate of AUTO_DETECT_ORDER) {
      if (candidate === "ollama") {
        if (env.OLLAMA_HOST) {
          provider = candidate;
          break;
        }
        continue;
      }
      const { apiKey } = findApiKey(candidate, env);
      if (apiKey) {
        provider = candidate;
        break;
      }
    }
    source = "auto";
  }

  if (!provider) {
    // Model/apiKeyEnv configured without a provider → assume OpenAI-compatible.
    if (merged.model || merged.apiKeyEnv || merged.baseUrl) provider = "openai";
    else return undefined;
  }

  const defaults = PROVIDER_DEFAULTS[provider];
  const bareModel = merged.model?.includes("/")
    ? merged.model.split("/").slice(1).join("/")
    : (merged.model ?? defaults.model);
  const { apiKey, apiKeyEnv } = findApiKey(provider, env, merged.apiKeyEnv);
  const baseUrl = merged.baseUrl ?? defaults.baseUrl?.(env);

  return {
    provider,
    model: bareModel,
    modelName: `${provider === "custom" ? "openai" : provider}/${bareModel}`,
    ...(apiKey ? { apiKey } : {}),
    ...(apiKeyEnv ? { apiKeyEnv } : {}),
    ...(baseUrl ? { baseUrl } : {}),
    source,
  };
}
