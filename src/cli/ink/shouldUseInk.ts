import type { ParsedCli } from "../parse.ts";

export function shouldUseInk(parsed: ParsedCli): boolean {
  return !parsed.global.noTui;
}


