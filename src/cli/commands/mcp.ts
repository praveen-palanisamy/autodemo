import type { ParsedCli } from "../parse.ts";
import { startMcpServer } from "../../mcp/server.ts";

export async function runMcp(_parsed: ParsedCli): Promise<void> {
  // MCP is stdio-based; always run headless.
  await startMcpServer();
}


