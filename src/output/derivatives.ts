import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";

export type AspectRatioPreset = "16:9" | "1:1" | "9:16";

/** `16:9` -> `16x9` for artifact file names. */
export function aspectSlug(aspect: AspectRatioPreset): string {
  return aspect.replace(":", "x");
}

async function runFfmpeg(args: string[], logPath?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout?.on("data", async (chunk) => {
      if (logPath) await appendFile(logPath, chunk);
    });
    p.stderr?.on("data", async (chunk) => {
      if (logPath) await appendFile(logPath, chunk);
    });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`ffmpeg exited with code ${code}${logPath ? ` (see ${logPath})` : ""}`),
        );
    });
  });
}

/**
 * Center-crop filter expression converting any input to the target aspect
 * without distortion, snapped to even dimensions for yuv420p.
 */
export function aspectCropFilter(aspect: AspectRatioPreset): string {
  const [w, h] = aspect.split(":").map(Number);
  return (
    `crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})',` +
    `scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1`
  );
}

/** Derive a center-cropped MP4 for a social aspect-ratio preset. */
export async function deriveAspectVideo(opts: {
  inputMp4: string;
  outputMp4: string;
  aspect: AspectRatioPreset;
  logPath?: string;
}): Promise<void> {
  await runFfmpeg(
    [
      "-y",
      "-i",
      opts.inputMp4,
      "-vf",
      aspectCropFilter(opts.aspect),
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
    ],
    opts.logPath,
  );
}

/**
 * Derive an animated GIF from a video using single-pass palettegen/paletteuse
 * (small file, good colors). Width is capped; height keeps aspect.
 */
export async function deriveGif(opts: {
  inputVideo: string;
  outputGif: string;
  maxWidthPx?: number;
  fps?: number;
  logPath?: string;
}): Promise<void> {
  const width = opts.maxWidthPx ?? 640;
  const fps = opts.fps ?? 12;
  const filter =
    `fps=${fps},scale='min(iw,${width})':-2:flags=lanczos,` +
    `split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer`;
  await runFfmpeg(
    ["-y", "-i", opts.inputVideo, "-filter_complex", filter, "-loop", "0", opts.outputGif],
    opts.logPath,
  );
}

const LOGO_MARGIN_PX = 24;

const LOGO_POSITIONS: Record<string, string> = {
  "top-left": `${LOGO_MARGIN_PX}:${LOGO_MARGIN_PX}`,
  "top-right": `W-w-${LOGO_MARGIN_PX}:${LOGO_MARGIN_PX}`,
  "bottom-left": `${LOGO_MARGIN_PX}:H-h-${LOGO_MARGIN_PX}`,
  "bottom-right": `W-w-${LOGO_MARGIN_PX}:H-h-${LOGO_MARGIN_PX}`,
};

/** Overlay a brand logo watermark onto a video (licensed-use branding). */
export async function applyLogoOverlay(opts: {
  inputMp4: string;
  outputMp4: string;
  logoPath: string;
  position?: keyof typeof LOGO_POSITIONS;
  logoWidthPx?: number;
  logPath?: string;
}): Promise<void> {
  const position = LOGO_POSITIONS[opts.position ?? "bottom-right"] ?? LOGO_POSITIONS["bottom-right"];
  const logoWidth = opts.logoWidthPx ?? 120;
  await runFfmpeg(
    [
      "-y",
      "-i",
      opts.inputMp4,
      "-i",
      opts.logoPath,
      "-filter_complex",
      `[1:v]scale=${logoWidth}:-1[logo];[0:v][logo]overlay=${position}`,
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
    ],
    opts.logPath,
  );
}

/** Burn subtitles into a video (requires ffmpeg built with libass). */
export async function burnInCaptions(opts: {
  inputMp4: string;
  outputMp4: string;
  srtPath: string;
  logPath?: string;
}): Promise<void> {
  // The subtitles filter parses its argument: escape backslashes, quotes, and
  // special characters in the path
  const escaped = opts.srtPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  await runFfmpeg(
    [
      "-y",
      "-i",
      opts.inputMp4,
      "-vf",
      `subtitles='${escaped}'`,
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
    ],
    opts.logPath,
  );
}
