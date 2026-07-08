import { appendFile, rename, access } from "node:fs/promises";
import path from "node:path";

import {
  aspectSlug,
  applyLogoOverlay,
  burnInCaptions,
  deriveAspectVideo,
  deriveGif,
  type AspectRatioPreset,
} from "./derivatives.ts";
import { writeCaptionFiles, type CaptionCue } from "./captions.ts";
import type { RunJsonVideoVariant } from "./types.ts";

export type BrandOverlayOpts = {
  logoPath?: string;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoWidthPx?: number;
};

export type PostProcessResult = {
  videoGifPath?: string;
  videoVariants?: RunJsonVideoVariant[];
  captionsSrtPath?: string;
  captionsVttPath?: string;
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function log(logPath: string | undefined, message: string): Promise<void> {
  if (!logPath) return;
  await appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`).catch(() => {});
}

/**
 * Post-process the assembled master MP4: brand logo overlay, captions
 * (sidecar + optional burn-in), social aspect-ratio variants, and GIF exports.
 * Every operation is best-effort — failures are logged and skipped so the
 * master video artifact is always preserved.
 */
export async function postProcessVideo(opts: {
  outDir: string;
  masterMp4Abs: string;
  brand?: BrandOverlayOpts;
  formats: Array<"mp4" | "gif">;
  aspectRatios: AspectRatioPreset[];
  captions: { enabled: boolean; burnIn: boolean };
  cues: CaptionCue[];
  logPath?: string;
}): Promise<PostProcessResult> {
  const result: PostProcessResult = {};

  if (opts.brand?.logoPath) {
    const logoAbs = path.isAbsolute(opts.brand.logoPath)
      ? opts.brand.logoPath
      : path.join(process.cwd(), opts.brand.logoPath);
    if (await fileExists(logoAbs)) {
      try {
        const tmp = path.join(opts.outDir, "video.logo.tmp.mp4");
        await applyLogoOverlay({
          inputMp4: opts.masterMp4Abs,
          outputMp4: tmp,
          logoPath: logoAbs,
          position: opts.brand.logoPosition,
          logoWidthPx: opts.brand.logoWidthPx,
          logPath: opts.logPath,
        });
        await rename(tmp, opts.masterMp4Abs);
      } catch (err) {
        await log(opts.logPath, `logo overlay failed: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      await log(opts.logPath, `logo overlay skipped: ${logoAbs} not found`);
    }
  }

  if (opts.captions.enabled && opts.cues.length > 0) {
    try {
      const { srtPath, vttPath } = await writeCaptionFiles(opts.outDir, opts.cues);
      result.captionsSrtPath = path.relative(opts.outDir, srtPath);
      result.captionsVttPath = path.relative(opts.outDir, vttPath);

      if (opts.captions.burnIn) {
        try {
          const tmp = path.join(opts.outDir, "video.captions.tmp.mp4");
          await burnInCaptions({
            inputMp4: opts.masterMp4Abs,
            outputMp4: tmp,
            srtPath,
            logPath: opts.logPath,
          });
          await rename(tmp, opts.masterMp4Abs);
        } catch (err) {
          await log(
            opts.logPath,
            `caption burn-in failed (ffmpeg may lack libass): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } catch (err) {
      await log(opts.logPath, `captions failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  const variants: RunJsonVideoVariant[] = [];
  for (const aspect of opts.aspectRatios) {
    const slug = aspectSlug(aspect);
    const mp4Rel = `video-${slug}.mp4`;
    try {
      await deriveAspectVideo({
        inputMp4: opts.masterMp4Abs,
        outputMp4: path.join(opts.outDir, mp4Rel),
        aspect,
        logPath: opts.logPath,
      });
      variants.push({ aspect: slug, mp4Path: mp4Rel });
    } catch (err) {
      await log(
        opts.logPath,
        `aspect variant ${aspect} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  if (opts.formats.includes("gif")) {
    try {
      const gifRel = "video.gif";
      await deriveGif({
        inputVideo: opts.masterMp4Abs,
        outputGif: path.join(opts.outDir, gifRel),
        logPath: opts.logPath,
      });
      result.videoGifPath = gifRel;
    } catch (err) {
      await log(opts.logPath, `gif export failed: ${err instanceof Error ? err.message : err}`);
    }

    for (const variant of variants) {
      try {
        const gifRel = `video-${variant.aspect}.gif`;
        await deriveGif({
          inputVideo: path.join(opts.outDir, variant.mp4Path),
          outputGif: path.join(opts.outDir, gifRel),
          logPath: opts.logPath,
        });
        variant.gifPath = gifRel;
      } catch (err) {
        await log(
          opts.logPath,
          `gif variant ${variant.aspect} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  if (variants.length > 0) {
    result.videoVariants = variants;
  }

  return result;
}
