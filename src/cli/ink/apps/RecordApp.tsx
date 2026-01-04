import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { existsSync } from "node:fs";
import path from "node:path";
import { recordScenario } from "../../../recording/recorder.ts";
import { createLogWriter } from "../../../utils/logWriter.ts";
import { setSigintAbortController } from "../../../utils/sigintManager.ts";
import { loadConfig } from "../../../config/loadConfig.ts";
import { readdirSync } from "node:fs";

type Props = {
  cwd: string;
  defaultConfigPath: string;
  onDone: (code: number) => void;
  initialValues?: { url?: string; name?: string };
};

type Step = "url" | "name" | "configPath" | "confirmReuse" | "record" | "done" | "error";

export function RecordApp({ cwd, defaultConfigPath, onDone, initialValues }: Props) {
  const [step, setStep] = useState<Step>(initialValues?.url ? (initialValues?.name ? "configPath" : "name") : "url");
  const [buffer, setBuffer] = useState("");
  const [url, setUrl] = useState(initialValues?.url || "");
  const [name, setName] = useState(initialValues?.name || "recorded");
  const [configPath, setConfigPath] = useState(defaultConfigPath);
  const [message, setMessage] = useState<string | null>(null);
  const [reuseConfirmed, setReuseConfirmed] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [configCandidates, setConfigCandidates] = useState<string[]>([]);
  const [selectIdx, setSelectIdx] = useState(0);
  const [configSelectMode, setConfigSelectMode] = useState<"select" | "type">("select");

  useEffect(() => {
    if (step === "name") setBuffer(name);
    if (step === "configPath") {
      const candidates = readdirSync(cwd).filter((f) => f.endsWith(".autodemo.yml"));
      const withDefault = Array.from(new Set([defaultConfigPath, ...candidates])).sort();
      setConfigCandidates([...withDefault, "<custom>"]);
      setSelectIdx(0);
      setConfigSelectMode("select");
      setBuffer(configPath);
    }
  }, [step, name, configPath]);

  useInput((input, key) => {
    // Allow Ctrl+C to stop recording and still save partial steps.
    if (key.ctrl && input === "c") {
      if (step === "record") {
        abortRef.current?.abort();
        return;
      }
      onDone(130);
      return;
    }

    if (step === "done" || step === "error") {
      if (key.return || input === "q" || input === "Q") onDone(step === "done" ? 0 : 1);
      return;
    }

    if (step === "record") {
      // Ignore typing while recording.
      return;
    }

    if (step === "confirmReuse") {
      if (input === "y" || input === "Y" || key.return) {
        setReuseConfirmed(true);
        setStep("record");
      } else if (input === "n" || input === "N" || input === "q" || input === "Q") {
        onDone(2);
      }
      return;
    }

    if (key.return) {
      const value = buffer.trim();
      if (step === "url") {
        setUrl(value);
        setBuffer("");
        setStep("name");
        return;
      }
      if (step === "name") {
        setName(value || "recorded");
        setBuffer(configPath);
        setStep("configPath");
        return;
      }
      if (step === "configPath") {
        if (configSelectMode === "select") {
          const picked = configCandidates[selectIdx] ?? defaultConfigPath;
          if (picked === "<custom>") {
            setConfigSelectMode("type");
            setBuffer("");
            return;
          }
          setConfigPath(picked);
        } else {
          setConfigPath(value || defaultConfigPath);
        }

        const effective = configSelectMode === "select" ? (configCandidates[selectIdx] ?? defaultConfigPath) : value || defaultConfigPath;
        const abs = path.isAbsolute(effective) ? effective : path.join(cwd, effective);
        const exists = existsSync(abs);
        setConfigExists(exists);
        if (exists && !reuseConfirmed) {
          setStep("confirmReuse");
        } else {
          setStep("record");
        }
        return;
      }
    }

    if (step === "configPath" && configSelectMode === "select") {
      if (key.upArrow) setSelectIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setSelectIdx((i) => Math.min(configCandidates.length - 1, i + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setBuffer((b) => b.slice(0, -1));
      return;
    }

    setBuffer((b) => b + input);
  });

  useEffect(() => {
    if (step !== "record") return;
    (async () => {
      try {
        if (!url) throw new Error("URL is required");
        const log = await createLogWriter({ kind: "record", name });
        abortRef.current = new AbortController();
        setSigintAbortController(abortRef.current);
        setMessage(
          `Launching browser…\n${configExists ? `Reusing config: ${configPath}\n` : ""}log: ${log.path}\nClose the browser window to finish recording.\n(Or click Stop & Save in the page, or Ctrl+C here.)`,
        );

        // If config exists, read recording.events and scroll throttle.
        let events: Array<"click" | "fill" | "scroll"> | undefined;
        let scrollThrottleMs: number | undefined;
        try {
          const abs = path.isAbsolute(configPath) ? configPath : path.join(cwd, configPath);
          if (existsSync(abs)) {
            const { config } = await loadConfig({ cwd, configPath: abs });
            const ev = config.recording?.events;
            if (Array.isArray(ev)) {
              events = ev.filter((e): e is "click" | "fill" | "scroll" => e === "click" || e === "fill" || e === "scroll");
            }
            const st = config.recording?.scrollThrottleMs;
            if (typeof st === "number") scrollThrottleMs = st;
          }
        } catch {
          // ignore; use defaults
        }

        const res = await recordScenario({
          cwd,
          url,
          name,
          configPath,
          logPath: log.path,
          signal: abortRef.current.signal,
          events,
          scrollThrottleMs,
        });
        setSigintAbortController(null);
        setMessage(`Saved scenario '${res.scenarioName}' to ${configPath}\nlog: ${res.logPath}`);
        setStep("done");
      } catch (err) {
        setSigintAbortController(null);
        setMessage(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    })();
  }, [step, cwd, url, name, configPath]);

  const prompt =
    step === "url"
      ? "Base URL (e.g. http://localhost:3000)"
      : step === "name"
        ? "Scenario name"
        : step === "configPath"
          ? "Write to config path"
          : step === "confirmReuse"
            ? null
          : null;

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Record scenario</Text>

      {prompt ? (
        <Box flexDirection="column">
          <Text dimColor>{prompt}</Text>
          {step === "configPath" && configSelectMode === "select" ? (
            <Box flexDirection="column">
              <Text dimColor>Pick a config (↑/↓ + Enter) or choose &lt;custom&gt; to type</Text>
              {configCandidates.map((c, i) => (
                <Text key={c} color={i === selectIdx ? "cyan" : undefined}>
                  {i === selectIdx ? "› " : "  "}
                  {c}
                </Text>
              ))}
            </Box>
          ) : (
            <Text>
              {"> "} {buffer}
            </Text>
          )}
          <Text dimColor>Press Enter to continue</Text>
        </Box>
      ) : step === "record" ? (
        <Box flexDirection="column">
          <Text>{message}</Text>
          <Text dimColor>Interact with the browser to capture steps.</Text>
        </Box>
      ) : step === "confirmReuse" ? (
        <Box flexDirection="column">
          <Text color="yellow">Config already exists: {configPath}</Text>
          <Text dimColor>
            Continue and append scenario(s) to this file? (y/N)
          </Text>
        </Box>
      ) : step === "done" ? (
        <Box flexDirection="column">
          <Text color="green">{message}</Text>
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color="red">Error: {message}</Text>
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      )}
    </Box>
  );
}


