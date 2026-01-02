import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { existsSync } from "node:fs";
import path from "node:path";
import { recordScenario } from "../../../recording/recorder.ts";

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

  useEffect(() => {
    if (step === "name") setBuffer(name);
    if (step === "configPath") setBuffer(configPath);
  }, [step, name, configPath]);

  useInput((input, key) => {
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
        setConfigPath(value || defaultConfigPath);
        const abs = path.isAbsolute(value || defaultConfigPath)
          ? value || defaultConfigPath
          : path.join(cwd, value || defaultConfigPath);
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

    if (key.backspace || key.delete) {
      setBuffer((b) => b.slice(0, -1));
      return;
    }

    if (key.ctrl && input === "c") {
      onDone(130);
      return;
    }

    setBuffer((b) => b + input);
  });

  useEffect(() => {
    if (step !== "record") return;
    (async () => {
      try {
        if (!url) throw new Error("URL is required");
        setMessage(
          `Launching browser…\n${configExists ? `Reusing config: ${configPath}\n` : ""}Close the browser window to finish recording.`,
        );
        await recordScenario({ cwd, url, name, configPath });
        setMessage(`Saved scenario '${name}' to ${configPath}`);
        setStep("done");
      } catch (err) {
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
          <Text>
            {"> "} {buffer}
          </Text>
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


