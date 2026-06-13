import { describe, expect, test } from "bun:test";

import { resolveRecordVideoSize } from "../../src/utils/videoCapture.ts";

describe("resolveRecordVideoSize", () => {
  const viewport = { width: 1600, height: 900 };

  test("defaults to viewport when record size is omitted", () => {
    expect(resolveRecordVideoSize(viewport)).toEqual(viewport);
  });

  test("defaults to viewport when record size mismatches (prevents letterbox jitter)", () => {
    expect(resolveRecordVideoSize(viewport, { width: 1280, height: 720 })).toEqual(viewport);
  });

  test("keeps explicit record size when it matches viewport", () => {
    expect(resolveRecordVideoSize(viewport, { width: 1600, height: 900 })).toEqual(viewport);
  });
});
