import { test, expect } from "bun:test";
import { normalizeRecordingUrl } from "../../src/recording/normalizeUrl.ts";

test("normalizeRecordingUrl splits origin and path", () => {
  const res = normalizeRecordingUrl("http://localhost:3010/signup?x=1#top");
  expect(res.origin).toBe("http://localhost:3010");
  expect(res.pathAndQuery).toBe("/signup?x=1#top");
});

test("normalizeRecordingUrl adds http:// if missing", () => {
  const res = normalizeRecordingUrl("localhost:3010/signup");
  expect(res.origin).toBe("http://localhost:3010");
  expect(res.pathAndQuery).toBe("/signup");
});


