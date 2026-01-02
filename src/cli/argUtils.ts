import { CliUsageError } from "./errors.ts";

export function popFlag(argv: string[], flag: string): boolean {
  const idx = argv.indexOf(flag);
  if (idx !== -1) {
    argv.splice(idx, 1);
    return true;
  }
  return false;
}

export function popOption(argv: string[], name: string): string | undefined {
  // 1. Check for "--name value"
  const idx = argv.indexOf(name);
  if (idx !== -1 && idx + 1 < argv.length) {
    const value = argv[idx + 1];
    argv.splice(idx, 2);
    return value;
  }

  // 2. Check for "--name=value"
  const prefix = `${name}=`;
  const eqIdx = argv.findIndex((arg) => arg.startsWith(prefix));
  if (eqIdx !== -1) {
    const val = argv[eqIdx].slice(prefix.length);
    argv.splice(eqIdx, 1);
    return val;
  }

  return undefined;
}

export function requireOption(value: string | undefined, name: string): string {
  if (!value) {
    throw new CliUsageError(`Missing required option: ${name}`);
  }
  return value;
}
