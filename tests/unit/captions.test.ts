import { test, expect } from "bun:test";

import {
  buildFrameCaptionCues,
  buildStepCaptionCues,
  formatSrt,
  formatVtt,
} from "../../src/output/captions.ts";

test("buildFrameCaptionCues aligns cues to frame durations", () => {
  const cues = buildFrameCaptionCues({
    frames: [
      { path: "0.png", durationMs: 800 },
      { path: "1.png", durationMs: 800 },
      { path: "2.png", durationMs: 2000 },
    ],
    notes: ["Open the app", undefined, "Done"],
  });
  expect(cues).toEqual([
    { startMs: 0, endMs: 800, text: "Open the app" },
    { startMs: 1600, endMs: 3600, text: "Done" },
  ]);
});

test("buildFrameCaptionCues shifts cues by intro lead-in", () => {
  const cues = buildFrameCaptionCues({
    frames: [{ path: "0.png", durationMs: 800 }],
    notes: ["Hello"],
    leadInMs: 2200,
  });
  expect(cues).toEqual([{ startMs: 2200, endMs: 3000, text: "Hello" }]);
});

test("buildFrameCaptionCues merges adjacent identical notes", () => {
  const cues = buildFrameCaptionCues({
    frames: [
      { path: "0.png", durationMs: 800 },
      { path: "1.png", durationMs: 800 },
    ],
    notes: ["Same note", "Same note"],
  });
  expect(cues).toEqual([{ startMs: 0, endMs: 1600, text: "Same note" }]);
});

test("buildStepCaptionCues uses step offsets minus trim offset", () => {
  const cues = buildStepCaptionCues(
    [
      { offsetMs: 1000, durationMs: 500, note: "Trimmed away" },
      { offsetMs: 5000, durationMs: 1200, note: "Visible" },
      { offsetMs: 7000, durationMs: 900 },
    ],
    4800,
  );
  // First cue ends at 1000 + 500 - 4800 < 0, so it is dropped.
  expect(cues).toEqual([{ startMs: 200, endMs: 1400, text: "Visible" }]);
});

test("formatSrt renders numbered cues with comma millis", () => {
  const srt = formatSrt([
    { startMs: 0, endMs: 1500, text: "First" },
    { startMs: 61234, endMs: 63000, text: "Second" },
  ]);
  expect(srt).toBe(
    "1\n00:00:00,000 --> 00:00:01,500\nFirst\n\n2\n00:01:01,234 --> 00:01:03,000\nSecond\n",
  );
});

test("formatVtt renders WEBVTT header with dot millis", () => {
  const vtt = formatVtt([{ startMs: 500, endMs: 2000, text: "Hello" }]);
  expect(vtt).toBe("WEBVTT\n\n00:00:00.500 --> 00:00:02.000\nHello\n");
});
