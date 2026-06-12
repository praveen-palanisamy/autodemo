import { spawnSync } from "node:child_process";

import { resolveLlm } from "../config/llm.ts";

export type DoctorCheck = {
  name: string;
  ok: boolean;
  message?: string;
};

export type DoctorReport = {
  ok: boolean;
  checks: DoctorCheck[];
};

export async function runDoctorChecks(): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];

  // ffmpeg
  {
    const res = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    checks.push({
      name: "ffmpeg",
      ok: res.status === 0,
      message: res.status === 0 ? undefined : "Install ffmpeg (required for MP4 conversion when video is enabled)",
    });
  }

  // Playwright chromium
  {
    try {
      const { chromium } = await import("@playwright/test");
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      checks.push({ name: "playwright.chromium", ok: true });
    } catch (err) {
      checks.push({
        name: "playwright.chromium",
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : "Unable to launch Playwright. Try `bunx playwright install --with-deps`.",
      });
    }
  }

  // LLM provider (informational; deterministic scenarios run without one)
  {
    const llm = resolveLlm({});
    checks.push({
      name: "llm",
      ok: true,
      message: llm
        ? `Detected ${llm.provider} (${llm.model})${llm.apiKeyEnv ? ` via ${llm.apiKeyEnv}` : ""}${llm.baseUrl ? ` at ${llm.baseUrl}` : ""}`
        : "No LLM detected. Deterministic steps work without one; for AI `act` steps set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY, or OLLAMA_HOST",
    });
  }

  return { ok: checks.every((c) => c.ok), checks };
}


