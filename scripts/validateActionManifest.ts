#!/usr/bin/env bun
/**
 * Validates action.yml against GitHub Marketplace listing rules we control locally.
 * @see https://docs.github.com/actions/creating-actions/publishing-actions-in-github-marketplace
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const MAX_DESCRIPTION_LEN = 125;
const MIN_DESCRIPTION_LEN = 10;
const MIN_NAME_LEN = 3;
const ALLOWED_COLORS = new Set([
  "white",
  "yellow",
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "gray-dark",
]);

type ActionManifest = {
  name?: string;
  description?: string;
  runs?: { using?: string };
  branding?: { icon?: string; color?: string };
};

const manifestPath = path.join(process.cwd(), "action.yml");
const raw = await readFile(manifestPath, "utf8");
const manifest = parseYaml(raw) as ActionManifest;

const errors: string[] = [];

if (!manifest.name?.trim()) {
  errors.push("action.yml: `name` is required");
} else {
  if (manifest.name.trim().length < MIN_NAME_LEN) {
    errors.push(`action.yml: \`name\` must be at least ${MIN_NAME_LEN} characters`);
  }
  if (manifest.name.trim() === "AutoDemo") {
    errors.push(
      "action.yml: `name` \"AutoDemo\" is not marketplace-safe (conflicts with existing listings). Use a unique name like \"AutoDemo Demos-as-Code\".",
    );
  }
}

const description = manifest.description?.replace(/\s+/g, " ").trim() ?? "";
if (!description) {
  errors.push("action.yml: `description` is required");
} else {
  if (description.length < MIN_DESCRIPTION_LEN) {
    errors.push(`action.yml: \`description\` must be at least ${MIN_DESCRIPTION_LEN} characters`);
  }
  if (description.length > MAX_DESCRIPTION_LEN) {
    errors.push(
      `action.yml: \`description\` is ${description.length} chars (max ${MAX_DESCRIPTION_LEN}): ${description}`,
    );
  }
}

if (!manifest.runs?.using) {
  errors.push("action.yml: `runs.using` is required");
}

const color = manifest.branding?.color;
if (color && !ALLOWED_COLORS.has(color)) {
  errors.push(`action.yml: branding.color "${color}" is not allowed (use one of ${[...ALLOWED_COLORS].join(", ")})`);
}

if (errors.length > 0) {
  for (const err of errors) console.error(err);
  process.exit(1);
}

console.log(`action.yml OK — name: "${manifest.name}", description: ${description.length}/${MAX_DESCRIPTION_LEN} chars`);
