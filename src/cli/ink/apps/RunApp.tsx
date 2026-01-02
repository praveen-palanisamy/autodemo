import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ParsedCli } from "../../parse.ts";
import { runCore } from "../../logic/runCore.ts";
import type { RunCoreResult } from "../../logic/runCore.ts";
import { Spinner } from "../components/Spinner.tsx";

type Props = {
  parsed: ParsedCli;
  onDone: (code: number) => void;
};

export function RunApp({ parsed, onDone }: Props) {
  const [state, setState] = useState<
    | { kind: "running" }
    | { kind: "done"; code: number; results: RunCoreResult["results"] }
    | { kind: "error"; code: number; message: string }
  >({ kind: "running" });

  const title = useMemo(() => {
    const scenario = parsed.args[0] ?? (parsed.args.includes("--all") ? "all" : "<scenario>");
    return `Running ${scenario}`;
  }, [parsed.args]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results, anyFailure } = await runCore(parsed);
        if (cancelled) return;
        setState({ kind: "done", code: anyFailure ? 1 : 0, results });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          code: 1,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  useInput((input, key) => {
    if (state.kind === "running") return;
    if (key.return || input === "q" || input === "Q") {
      onDone(state.code);
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text>{title}</Text>

      {state.kind === "running" ? (
        <Spinner label="Running scenarios..." />
      ) : state.kind === "error" ? (
        <Box flexDirection="column">
          <Text color="red">Error: {state.message}</Text>
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {state.results.map((r) => (
            <Box key={r.scenario} flexDirection="column">
              <Text>
                {r.status.padEnd(7)} {r.scenario} → {r.outDir}
              </Text>
              <Text dimColor>run.json: {r.artifacts.runJson}</Text>
              {r.artifacts.videoMp4 ? <Text dimColor>video: {r.artifacts.videoMp4}</Text> : null}
              {r.artifacts.ffmpegLogPath ? <Text dimColor>ffmpeg log: {r.artifacts.ffmpegLogPath}</Text> : null}
              {r.failureMessage ? <Text color="red">{r.failureMessage}</Text> : null}
            </Box>
          ))}
          <Text dimColor>Press Enter or q to exit</Text>
        </Box>
      )}
    </Box>
  );
}


