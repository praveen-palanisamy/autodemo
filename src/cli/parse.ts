export type GlobalFlags = {
  noTui: boolean;
  json: boolean;
  configPath?: string;
  cwd: string;
};

export type ParsedCli = {
  global: GlobalFlags;
  command?: "help" | "init" | "record" | "run" | "doctor" | "mcp";
  args: string[];
};

function popFlag(argv: string[], flag: string): boolean {
  const idx = argv.indexOf(flag);
  if (idx === -1) return false;
  argv.splice(idx, 1);
  return true;
}

function popOption(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  argv.splice(idx, 2);
  return value;
}

export function parseCli(argvIn: string[]): ParsedCli {
  const argv = [...argvIn];

  const json = popFlag(argv, "--json");
  const noTuiFlag = popFlag(argv, "--no-tui");
  const forceTui = popFlag(argv, "--tui");
  const isCi = process.env.CI === "true" || process.env.CI === "1";

  const global: GlobalFlags = {
    // Bun/Node can report isTTY as undefined in some environments; only treat it as non-TTY when explicitly false.
    noTui: noTuiFlag || json || (!forceTui && (isCi || process.stdout.isTTY === false)),
    json,
    configPath: popOption(argv, "--config"),
    cwd: process.cwd(),
  };

  if (argv.length === 0) {
    return { global, command: "help", args: [] };
  }

  const [commandRaw, ...rest] = argv;
  if (commandRaw === "-h" || commandRaw === "--help" || commandRaw === "help") {
    return { global, command: "help", args: rest };
  }

  const command = commandRaw as ParsedCli["command"];
  return { global, command, args: rest };
}


