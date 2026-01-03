import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import path from "node:path";
import { readdirSync, existsSync } from "node:fs";

import { loadConfig } from "../../../config/loadConfig.ts";
import { runScenario } from "../../../scenario/runner.ts";
import { Spinner } from "../components/Spinner.tsx";

type Props = {
  cwd: string;
  defaultConfigPath: string;
  onDone: (code: number) => void;
  initial?: { scenario?: string; url?: string };
};

type Step = "pickConfig" | "pickScenario" | "url" | "headless" | "running" | "done" | "error";

function findConfigCandidates(cwd: string): string[] {
  const files = readdirSync(cwd);
  const candidates = files.filter((f) => f === ".autodemo.yml" || f.endsWith(".autodemo.yml"));
  return candidates.sort((a, b) => a.localeCompare(b));
}

export function RunWizardApp({ cwd, defaultConfigPath, onDone, initial }: Props) {
  const configs = useMemo(() => findConfigCandidates(cwd), [cwd]);
  const [step, setStep] = useState<Step>(configs.length > 1 ? "pickConfig" : "pickScenario");
  const [idx, setIdx] = useState(0);

  const [configPath, setConfigPath] = useState<string>(() => {
    if (configs.length === 1) return configs[0];
    return defaultConfigPath;
  });

  const [scenarioNames, setScenarioNames] = useState<string[]>([]);
  const [scenario, setScenario] = useState<string | undefined>(initial?.scenario);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [headless, setHeadless] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ outDir: string; runJson: string; video?: string; log?: string } | null>(null);

  useEffect(() => {
    // Load config to populate scenarios and default URL.
    (async () => {
      try {
        const abs = path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath);
        if (!existsSync(abs)) return;
        const { config } = await loadConfig({ cwd, configPath: abs });
        const names = Object.keys(config.scenarios);
        setScenarioNames(names);
        if (!url && config.project.baseUrl) setUrl(config.project.baseUrl);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    })();
  }, [cwd, configPath]);

  useInput((input, key) => {
    if (step === "running") return;
    if (step === "done" || step === "error") {
      if (key.return || input === "q" || input === "Q") onDone(step === "done" ? 0 : 1);
      return;
    }

    if (key.ctrl && input === "c") onDone(130);

    if (step === "pickConfig") {
      if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setIdx((i) => Math.min(configs.length - 1, i + 1));
      if (key.return) {
        setConfigPath(configs[idx]);
        setIdx(0);
        setStep("pickScenario");
      }
      return;
    }

    if (step === "pickScenario") {
      if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setIdx((i) => Math.min(scenarioNames.length - 1, i + 1));
      if (key.return) {
        const picked = scenarioNames[idx];
        setScenario(picked);
        setStep("url");
      }
      return;
    }

    if (step === "url") {
      if (key.return) {
        setStep("headless");
        return;
      }
      if (key.backspace || key.delete) {
        setUrl((u) => u.slice(0, -1));
        return;
      }
      setUrl((u) => u + input);
      return;
    }

    if (step === "headless") {
      if (input === " " || key.return) {
        setHeadless((h) => !h);
        return;
      }
      if (input === "r" || input === "R") {
        setStep("running");
        return;
      }
    }
  });

  useEffect(() => {
    if (step !== "running") return;
    (async () => {
      try {
        if (!scenario) throw new Error("No scenario selected");
        const abs = path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath);
        const { config } = await loadConfig({ cwd, configPath: abs });
        const baseUrl = url || config.project.baseUrl;
        if (!baseUrl) throw new Error("Missing baseUrl. Provide a URL.");

        const outDirBase = path.isAbsolute(config.output.dir) ? config.output.dir : path.join(cwd, config.output.dir);
        const res = await runScenario({
          config,
          scenarioName: scenario,
          baseUrl,
          outputDirBase: outDirBase,
          headless,
        });

        setResult({
          outDir: res.outDir,
          runJson: res.artifacts.runJson,
          video: res.artifacts.videoMp4,
          log: res.artifacts.ffmpegLogPath,
        });
        setStep(res.status === "success" ? "done" : "error");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    })();
  }, [step, cwd, configPath, scenario, url, headless]);

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Run scenario (interactive)</Text>

      {step === "pickConfig" ? (
        <Box flexDirection="column">
          <Text dimColor>Select a config file</Text>
          {configs.map((c, i) => (
            <Text key={c} color={i === idx ? "cyan" : undefined}>
              {i === idx ? "› " : "  "}
              {c}
            </Text>
          ))}
        </Box>
      ) : step === "pickScenario" ? (
        <Box flexDirection="column">
          <Text dimColor>Config: {configPath}</Text>
          <Text dimColor>Select a scenario</Text>
          {scenarioNames.length === 0 ? (
            <Text color="red">No scenarios found in config.</Text>
          ) : (
            scenarioNames.map((s, i) => (
              <Text key={s} color={i === idx ? "cyan" : undefined}>
                {i === idx ? "› " : "  "}
                {s}
              </Text>
            ))
          )}
        </Box>
      ) : step === "url" ? (
        <Box flexDirection="column">
          <Text dimColor>Base URL (press Enter to accept)</Text>
          <Text>
            {"> "} {url}
          </Text>
          <Text dimColor>Tip: if your URL contains '&', quote it in shells.</Text>
        </Box>
      ) : step === "headless" ? (
        <Box flexDirection="column">
          <Text dimColor>Headless: {headless ? "yes" : "no"}</Text>
          <Text dimColor>Press Space to toggle. Press 'r' to run.</Text>
        </Box>
      ) : step === "running" ? (
        <Spinner label="Running..." />
      ) : step === "done" ? (
        <Box flexDirection="column">
          <Text color="green">Success</Text>
          {result ? (
            <Box flexDirection="column">
              <Text dimColor>out: {result.outDir}</Text>
              <Text dimColor>run.json: {result.runJson}</Text>
              {result.video ? <Text dimColor>video: {result.video}</Text> : null}
              {result.log ? <Text dimColor>log: {result.log}</Text> : null}
            </Box>
          ) : null}
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="red">Error: {message}</Text>
          {result ? (
            <Box flexDirection="column">
              <Text dimColor>out: {result.outDir}</Text>
              <Text dimColor>run.json: {result.runJson}</Text>
              {result.video ? <Text dimColor>video: {result.video}</Text> : null}
              {result.log ? <Text dimColor>log: {result.log}</Text> : null}
            </Box>
          ) : null}
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      )}
    </Box>
  );
}


