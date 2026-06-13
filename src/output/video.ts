import { spawn } from "node:child_process";
import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function isFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("exit", (code) => resolve(code === 0));
  });
}

export async function convertWebmToMp4(opts: {
  inputWebm: string;
  outputMp4: string;
  logPath?: string;
  width?: number;
  height?: number;
  fps?: number;
  startMs?: number;
}): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const width = opts.width ?? 1440;
    const height = opts.height ?? 810;
    const fps = opts.fps ?? 30;
    // Scale to exact output dimensions. When Playwright recordVideo.size matches
    // viewport, the WebM is already the target size — no letterbox padding needed.
    const vf = `scale=${width}:${height}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1,fps=${fps}`;
    const args = [
      "-y",
      "-i",
      opts.inputWebm,
      ...(opts.startMs && opts.startMs > 0 ? ["-ss", (opts.startMs / 1000).toFixed(3)] : []),
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
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
      else
        reject(
          new Error(
            `ffmpeg exited with code ${code}${opts.logPath ? ` (see ${opts.logPath})` : ""}`,
          ),
        );
    });
  });
}

export type VideoFrame = {
  path: string;
  durationMs: number;
};

/**
 * Build MP4 from viewport PNG frames. Avoids Playwright recordVideo glitches during scroll.
 */
export async function assembleMp4FromFrames(opts: {
  frames: VideoFrame[];
  outputMp4: string;
  width: number;
  height: number;
  fps?: number;
  endPauseMs?: number;
  logPath?: string;
}): Promise<void> {
  if (opts.frames.length === 0) {
    throw new Error("assembleMp4FromFrames: no frames");
  }

  const fps = opts.fps ?? 30;
  const listPath = path.join(path.dirname(opts.outputMp4), "frames.ffconcat");
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < opts.frames.length; i++) {
    const frame = opts.frames[i];
    const durationSec = frame.durationMs / 1000;
    const abs = path.resolve(frame.path);
    lines.push(`file '${abs.replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${durationSec.toFixed(3)}`);
  }
  // ffconcat requires the last file repeated without duration
  const last = opts.frames[opts.frames.length - 1];
  lines.push(`file '${last.path.replace(/'/g, "'\\''")}'`);
  await writeFile(listPath, lines.join("\n") + "\n", "utf8");

  await new Promise<void>((resolve, reject) => {
    const vf = `scale=${opts.width}:${opts.height}:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1,fps=${fps}`;
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
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
      else
        reject(
          new Error(
            `ffmpeg frame assembly exited with code ${code}${opts.logPath ? ` (see ${opts.logPath})` : ""}`,
          ),
        );
    });
  });
}
