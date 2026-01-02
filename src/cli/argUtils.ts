import { CliUsageError } from "./errors.ts";

export function popFlag(argv: string[], flag: string): boolean {
  const idx = argv.indexOf(flag);
  if (idx === -1) return false;
  argv.splice(idx, 1);
  return true;
}

export function popOption(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  argv.splice(idx, 2);
  return value;
}

export function requireOption(value: string | undefined, name: string): string {
  if (!value) {
    throw new CliUsageError(`Missing required option: ${name}`);
  }
  return value;
}


