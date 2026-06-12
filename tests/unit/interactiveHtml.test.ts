import { describe, expect, test } from "bun:test";

import { generateInteractiveHtml } from "../../src/output/interactive/generateInteractiveHtml.ts";

describe("generateInteractiveHtml", () => {
  test("includes branding footer by default", () => {
    const html = generateInteractiveHtml();
    expect(html).toContain("Made with");
    expect(html).toContain("github.com/praveen-palanisamy/autodemo");
  });

  test("omits branding footer when disabled", () => {
    const html = generateInteractiveHtml({ branding: false });
    expect(html).not.toContain("Made with");
  });

  test("remains a self-contained static page", () => {
    const html = generateInteractiveHtml();
    expect(html).toContain('fetch("./run.json")');
    expect(html).not.toContain("http://localhost");
  });
});
