import type { ParsedCli } from "../parse.ts";
import { startMcpServer } from "../../mcp/server.ts";

export async function runMcp(parsed: ParsedCli): Promise<void> {
  void parsed;
  // MCP is stdio-based; always run headless.
  await startMcpServer();

  // Keep process alive while stdio transport is connected.
  await new Promise(() => {});
}


