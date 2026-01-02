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

  const global: GlobalFlags = {
    noTui: popFlag(argv, "--no-tui"),
    json: popFlag(argv, "--json"),
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


