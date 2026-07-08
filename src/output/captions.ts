import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { VideoFrame } from "./video.ts";

export type CaptionCue = {
  startMs: number;
  endMs: number;
  text: string;
};

/**
 * Build caption cues aligned to the frames video timeline. Frame `i` of
 * `frames` corresponds to `notes[i]` (the step note for that frame, if any);
 * `leadInMs` accounts for a prepended intro title card.
 */
export function buildFrameCaptionCues(opts: {
  frames: VideoFrame[];
  notes: Array<string | undefined>;
  leadInMs?: number;
}): CaptionCue[] {
  const cues: CaptionCue[] = [];
  let cursorMs = opts.leadInMs ?? 0;
  for (let i = 0; i < opts.frames.length; i++) {
    const durationMs = opts.frames[i].durationMs;
    const text = opts.notes[i]?.trim();
    if (text) {
      cues.push({ startMs: cursorMs, endMs: cursorMs + durationMs, text });
    }
    cursorMs += durationMs;
  }
  return mergeAdjacentCues(cues);
}

/**
 * Build caption cues from recorded step timings (wall-clock timeline used by
 * the Playwright recordVideo source). `startOffsetMs` is the video trim offset.
 */
export function buildStepCaptionCues(
  steps: Array<{ offsetMs?: number; durationMs?: number; note?: string }>,
  startOffsetMs = 0,
): CaptionCue[] {
  const cues: CaptionCue[] = [];
  for (const step of steps) {
    const text = step.note?.trim();
    if (!text || step.offsetMs === undefined) continue;
    const startMs = step.offsetMs - startOffsetMs;
    const endMs = startMs + (step.durationMs ?? 1000);
    if (endMs <= 0) continue;
    cues.push({ startMs: Math.max(0, startMs), endMs, text });
  }
  return mergeAdjacentCues(cues);
}

/** Merge consecutive cues with identical text into one longer cue. */
function mergeAdjacentCues(cues: CaptionCue[]): CaptionCue[] {
  const merged: CaptionCue[] = [];
  for (const cue of cues) {
    const last = merged[merged.length - 1];
    if (last && last.text === cue.text && Math.abs(last.endMs - cue.startMs) < 1) {
      last.endMs = cue.endMs;
    } else {
      merged.push({ ...cue });
    }
  }
  return merged;
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, "0");
}

function formatTimestamp(ms: number, separator: "," | "."): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}${separator}${pad(millis, 3)}`;
}

export function formatSrt(cues: CaptionCue[]): string {
  return (
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${formatTimestamp(cue.startMs, ",")} --> ${formatTimestamp(cue.endMs, ",")}\n${cue.text}`,
      )
      .join("\n\n") + "\n"
  );
}

export function formatVtt(cues: CaptionCue[]): string {
  const body = cues
    .map(
      (cue) =>
        `${formatTimestamp(cue.startMs, ".")} --> ${formatTimestamp(cue.endMs, ".")}\n${cue.text}`,
    )
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

/** Write captions.srt + captions.vtt into the scenario output directory. */
export async function writeCaptionFiles(
  outDir: string,
  cues: CaptionCue[],
): Promise<{ srtPath: string; vttPath: string }> {
  const srtPath = path.join(outDir, "captions.srt");
  const vttPath = path.join(outDir, "captions.vtt");
  await writeFile(srtPath, formatSrt(cues), "utf8");
  await writeFile(vttPath, formatVtt(cues), "utf8");
  return { srtPath, vttPath };
}
