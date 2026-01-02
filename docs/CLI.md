## CLI

All commands support:
- `--config <path>`: path to `.autodemo.yml` (default: `./.autodemo.yml`)
- `--tui`: force Ink UI (useful if your environment doesn't report TTY correctly)
- `--no-tui`: disable Ink UI (auto-enabled in CI / non-TTY)
- `--json`: machine-readable JSON output (implies `--no-tui`)

### Commands

#### `autodemo init`

Creates `.autodemo.yml` if missing and ensures `output.dir` exists.

#### `autodemo record`

Generate/update a scenario from a natural-language instruction.

- **Non-interactive**:

```bash
bun run dev -- record --url http://localhost:3000 --instruction "Sign up and open dashboard" --name signup
```

- **Interactive (Ink)**:

```bash
bun run dev -- record
```

#### `autodemo run`

Run a single scenario or all scenarios.

```bash
bun run dev -- run signup --no-tui
bun run dev -- run --all --no-tui
```

Options:
- `--url <url>`: override base URL
- `--outDir <dir>`: override output directory base
- `--headless`: force headless browser
- `--headed` / `--headful`: force headed (non-headless) browser
- `--debug`: save `trace.zip` even on success

#### `autodemo doctor`

Checks local dependencies:
- `ffmpeg`
- Playwright Chromium launch

#### `autodemo mcp`

Starts an MCP server over stdio for agent tooling.

### Exit codes

- `0`: success
- `1`: run failure
- `2`: usage/config error (invalid args or invalid `.autodemo.yml`)


