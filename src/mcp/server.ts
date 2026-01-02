import path from "node:path";
import { writeFile } from "node:fs/promises";
import * as z from "zod/v4";
import YAML from "yaml";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "../config/loadConfig.ts";
import { defaultConfig } from "../config/defaultConfig.ts";
import { upsertScenarioFromInstruction } from "../scenario/authoring.ts";
import { runScenario } from "../scenario/runner.ts";

export async function startMcpServer(): Promise<void> {
  const mcp = new McpServer({
    name: "autodemo",
    version: "0.1.0",
  });

  mcp.registerTool(
    "autodemo.scenarios.list",
    {
      description: "List scenarios from .autodemo.yml",
      inputSchema: {
        configPath: z.string().optional().describe("Optional path to .autodemo.yml"),
      },
    },
    async ({ configPath }) => {
      const { config } = await loadConfig({ cwd: process.cwd(), configPath });
      const scenarios = Object.entries(config.scenarios).map(([name, sc]) => ({
        name,
        description: sc.description,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ scenarios }, null, 2) }] };
    },
  );

  mcp.registerTool(
    "autodemo.scenario.generate",
    {
      description: "Generate a scenario YAML from a natural-language instruction",
      inputSchema: {
        url: z.string().min(1).describe("Base URL of the app"),
        instruction: z.string().min(1).describe("Natural language scenario instruction"),
        writeTo: z.string().optional().describe("If provided, writes updated config to this path"),
        name: z.string().optional().describe("Scenario name (default: recorded)"),
      },
    },
    async ({ url, instruction, writeTo, name }) => {
      const cfg = defaultConfig();
      const updated = upsertScenarioFromInstruction(cfg, {
        name: name ?? "recorded",
        url,
        instruction,
      });
      const scenarioYaml = YAML.stringify(updated);
      if (writeTo) {
        const abs = path.isAbsolute(writeTo) ? writeTo : path.join(process.cwd(), writeTo);
        await writeFile(abs, scenarioYaml, "utf8");
      }
      return {
        content: [
          {
            type: "text",
            text: scenarioYaml,
          },
        ],
      };
    },
  );

  mcp.registerTool(
    "autodemo.run",
    {
      description: "Run a scenario and return artifact paths",
      inputSchema: {
        scenario: z.string().min(1),
        url: z.string().optional(),
        outDir: z.string().optional(),
        headless: z.boolean().optional(),
        configPath: z.string().optional(),
      },
    },
    async ({ scenario, url, outDir, headless, configPath }) => {
      const { config } = await loadConfig({ cwd: process.cwd(), configPath });
      const baseUrl = url ?? config.project.baseUrl;
      if (!baseUrl) throw new Error("Missing baseUrl");

      const outputDirBase = outDir
        ? path.isAbsolute(outDir)
          ? outDir
          : path.join(process.cwd(), outDir)
        : path.join(process.cwd(), config.output.dir);

      const result = await runScenario({
        config,
        scenarioName: scenario,
        baseUrl,
        outputDirBase,
        headless,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: result.status,
                outDir: result.outDir,
                artifacts: {
                  interactiveHtml: result.artifacts.interactiveHtml,
                  runJson: result.artifacts.runJson,
                  videoMp4: result.artifacts.videoMp4,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}


