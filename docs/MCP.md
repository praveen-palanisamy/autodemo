## MCP Server

AutoDemo ships an MCP server over stdio.

Start it:

```bash
bunx autodemo mcp --no-tui
```

See [`docs/AGENTS.md`](AGENTS.md) for ready-made Cursor / Claude Code / Codex registration snippets and an agent rules template.

### Tools

#### `autodemo.scenarios.list`

Lists scenarios from `.autodemo.yml`.

Input:
- `configPath?: string`

#### `autodemo.scenario.generate`

Generates a scenario YAML from a natural-language instruction (writes a minimal runnable scenario).

Input:
- `url: string`
- `instruction: string`
- `writeTo?: string`
- `name?: string`

#### `autodemo.run`

Runs a scenario and returns artifact paths.

Input:
- `scenario: string`
- `url?: string`
- `outDir?: string`
- `headless?: boolean`
- `configPath?: string`

### Notes

- Tools currently return JSON as `text` content (suitable for agent tool-use).
- `autodemo.run` is Stagehand-first (uses `act` when present, Playwright fallback for deterministic steps).


