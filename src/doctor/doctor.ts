import { spawnSync } from "node:child_process";

export type DoctorCheck = {
  name: string;
  ok: boolean;
  message?: string;
};

export type DoctorReport = {
  ok: boolean;
  checks: DoctorCheck[];
};

export async function runDoctorChecks(_opts: { cwd: string }): Promise<DoctorReport> {
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

  return { ok: checks.every((c) => c.ok), checks };
}


