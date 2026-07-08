import { test, expect } from "bun:test";

import { aspectCropFilter, aspectSlug } from "../../src/output/derivatives.ts";
import { AutoDemoConfigSchema } from "../../src/config/schema.ts";

test("aspectSlug converts ratio to file-safe slug", () => {
  expect(aspectSlug("16:9")).toBe("16x9");
  expect(aspectSlug("1:1")).toBe("1x1");
  expect(aspectSlug("9:16")).toBe("9x16");
});

test("aspectCropFilter center-crops to the target ratio", () => {
  expect(aspectCropFilter("1:1")).toBe(
    "crop='min(iw,ih*1/1)':'min(ih,iw*1/1)',scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1",
  );
  expect(aspectCropFilter("9:16")).toBe(
    "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1",
  );
});

test("output schema defaults keep v1 behavior (mp4 only, no variants)", () => {
  const config = AutoDemoConfigSchema.parse({
    project: { name: "Test" },
    output: { dir: "public/demos" },
  });
  expect(config.output.formats).toEqual(["mp4"]);
  expect(config.output.aspectRatios).toEqual([]);
  expect(config.output.captions).toEqual({ enabled: false, burnIn: false });
  expect(config.output.brand).toBeUndefined();
});

test("output schema accepts full v2 export options", () => {
  const config = AutoDemoConfigSchema.parse({
    project: { name: "Test" },
    output: {
      dir: "public/demos",
      formats: ["mp4", "gif"],
      aspectRatios: ["1:1", "9:16"],
      captions: { enabled: true, burnIn: true },
      brand: {
        logoPath: "public/brand/logo.svg",
        logoPosition: "top-right",
        introCard: true,
        outroCard: true,
        outroText: "Get started at verber.me",
      },
    },
  });
  expect(config.output.formats).toEqual(["mp4", "gif"]);
  expect(config.output.aspectRatios).toEqual(["1:1", "9:16"]);
  expect(config.output.captions.burnIn).toBe(true);
  expect(config.output.brand?.logoWidthPx).toBe(120);
  expect(config.output.brand?.cardDurationMs).toBe(2200);
  expect(config.output.brand?.background).toBe("#111827");
});
