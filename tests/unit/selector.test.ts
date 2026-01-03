import { test, expect } from "bun:test";
import { buildSelectorAndNote } from "../../src/recording/selector.ts";

test("prefers data-testid", () => {
  const { selector, note } = buildSelectorAndNote({
    type: "click",
    el: { tag: "button", testId: "login" },
  });
  expect(selector).toBe('[data-testid="login"]');
  expect(note).toContain("login");
});

test("uses label >> input for fills when labelText exists", () => {
  const { selector, note } = buildSelectorAndNote({
    type: "fill",
    el: { tag: "input", labelText: "Email" },
    value: "x",
  });
  expect(selector).toContain('label:has-text("Email")');
  expect(note).toBe("Fill Email");
});

test("uses :has-text for clickable text fallback", () => {
  const { selector } = buildSelectorAndNote({
    type: "click",
    el: { tag: "button", text: "Sign in" },
  });
  expect(selector).toContain('button:has-text("Sign in")');
});


