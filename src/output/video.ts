import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";

export async function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

export async function convertWebmToMp4(opts: { inputWebm: string; outputMp4: string; logPath?: string }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      opts.inputWebm,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      opts.outputMp4,
    ];
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout?.on("data", async (chunk) => {
      if (opts.logPath) await appendFile(opts.logPath, chunk);
    });
    p.stderr?.on("data", async (chunk) => {
      if (opts.logPath) await appendFile(opts.logPath, chunk);
    });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}${opts.logPath ? ` (see ${opts.logPath})` : ""}`));
    });
  });
}


