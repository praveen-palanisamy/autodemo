import path from "node:path";
import { appendFile, mkdir } from "node:fs/promises";

export type LogWriter = {
  path: string;
  write: (line: string) => Promise<void>;
};

export async function createLogWriter(opts: { kind: string; name: string }): Promise<LogWriter> {
  const logsDir = path.join(process.cwd(), "logs");
  await mkdir(logsDir, { recursive: true });
  const ts = Date.now();
  const safeName = opts.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const logPath = path.join(logsDir, `${ts}_${opts.kind}_${safeName}.log`);
  return {
    path: logPath,
    write: async (line: string) => {
      await appendFile(logPath, line);
    },
  };
}

export async function createLogWriterAt(logPath: string): Promise<LogWriter> {
  const dir = path.dirname(logPath);
  await mkdir(dir, { recursive: true });
  return {
    path: logPath,
    write: async (line: string) => {
      await appendFile(logPath, line);
    },
  };
}


