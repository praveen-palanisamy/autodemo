import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";

import { recordCore } from "../../logic/recordCore.ts";

type Props = {
  cwd: string;
  defaultConfigPath: string;
  onDone: (code: number) => void;
};

type Step = "url" | "name" | "instruction" | "configPath" | "writing" | "done" | "error";

export function RecordApp({ cwd, defaultConfigPath, onDone }: Props) {
  const [step, setStep] = useState<Step>("url");
  const [buffer, setBuffer] = useState("");

  const [url, setUrl] = useState("");
  const [name, setName] = useState("recorded");
  const [instruction, setInstruction] = useState("");
  const [configPath, setConfigPath] = useState(defaultConfigPath);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Prime buffer with defaults for some steps.
    if (step === "name") setBuffer(name);
    if (step === "configPath") setBuffer(configPath);
  }, [step]);

  useInput((input, key) => {
    if (step === "writing") return;

    if (step === "done" || step === "error") {
      if (key.return || input === "q" || input === "Q") onDone(step === "done" ? 0 : 1);
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
        setBuffer("");
        setStep("instruction");
        return;
      }
      if (step === "instruction") {
        setInstruction(value);
        setBuffer(configPath);
        setStep("configPath");
        return;
      }
      if (step === "configPath") {
        setConfigPath(value || defaultConfigPath);
        setStep("writing");
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
    if (step !== "writing") return;
    (async () => {
      try {
        if (!url) throw new Error("URL is required");
        if (!instruction) throw new Error("Instruction is required");
        const res = await recordCore({ cwd, url, instruction, name, configPath });
        setMessage(`Wrote scenario '${res.scenario}' to ${res.configPath}`);
        setStep("done");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : String(err));
        setStep("error");
      }
    })();
  }, [step, cwd, url, instruction, name, configPath, defaultConfigPath]);

  const prompt =
    step === "url"
      ? "Base URL (e.g. http://localhost:3000)"
      : step === "name"
        ? "Scenario name"
        : step === "instruction"
          ? "Instruction"
          : step === "configPath"
            ? "Write to config path"
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
      ) : step === "writing" ? (
        <Text>Writing…</Text>
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


