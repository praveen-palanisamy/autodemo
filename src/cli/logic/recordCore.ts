import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import YAML from "yaml";

import { defaultAutodemoYamlTemplate } from "../../config/templates/autodemoYaml.ts";
import { normalizeRecordingUrl } from "../../recording/normalizeUrl.ts";

export type RecordCoreInput = {
  cwd: string;
  url: string;
  instruction: string;
  name: string;
  configPath: string;
};

export async function recordCore(input: RecordCoreInput): Promise<{ scenario: string; configPath: string }> {
  const configPathAbs = path.isAbsolute(input.configPath)
    ? input.configPath
    : path.join(input.cwd, input.configPath);

  const yamlText = existsSync(configPathAbs)
    ? await readFile(configPathAbs, "utf8")
    : defaultAutodemoYamlTemplate();

  const doc = YAML.parseDocument(yamlText);

  const normalized = normalizeRecordingUrl(input.url);
  // Prefer setting baseUrl to the provided origin (portable); only overwrite placeholder default.
  const baseUrl = doc.getIn(["project", "baseUrl"]);
  if (!baseUrl || String(baseUrl) === "http://localhost:3000") {
    doc.setIn(["project", "baseUrl"], normalized.origin);
  }

  if (!doc.get("scenarios")) {
    doc.set("scenarios", {});
  }

  doc.setIn(["scenarios", input.name], {
    description: `Recorded: ${input.instruction}`,
    steps: [
      { type: "goto", url: normalized.pathAndQuery },
      { type: "act", instruction: input.instruction },
    ],
  });

  await writeFile(configPathAbs, doc.toString(), "utf8");
  return { scenario: input.name, configPath: configPathAbs };
}


