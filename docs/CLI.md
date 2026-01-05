## CLI

All commands support:
- `--config <path>`: path to `.autodemo.yml` (default: `./.autodemo.yml`)
- `--tui`: force Ink UI (useful if your environment doesn't report TTY correctly)
- `--no-tui`: disable Ink UI (auto-enabled in CI / non-TTY)
- `--json`: machine-readable JSON output (implies `--no-tui`)
- `--help` / `-h`: show help

### Commands

#### `autodemo init`

Creates `.autodemo.yml` if missing and ensures `output.dir` exists.

#### `autodemo record`

Generate/update a scenario from a natural-language instruction **or** record real interactions in a headed browser.

- **Non-interactive (instruction → act step)**:

```bash
bun run dev -- record --url http://localhost:3000 --instruction "Sign up and open dashboard" --name signup
```

- **Interactive (capture clicks/typing)**:

```bash
bun run dev -- record --interactive --url http://localhost:3000 --name signup --out .autodemo.yml
```
You can also omit flags and use the Ink wizard: `bun run dev -- record`

Options:
- `--url <url>`: base URL to open in the browser
- `--name <scenario>`: scenario name to write (default: `recorded`)
- `--out <path>`: config file to write/append into (default: `--config` or `./.autodemo.yml`)
- `--instruction "<text>"`: non-interactive mode (generates a runnable scenario using `act`)
- `--interactive`: interactive recording mode (captures clicks/fills/scrolls per config)

Stopping recording:
- Close the browser window
- Click **Stop & Save** in the page
- Ctrl+C in the terminal (saves partial steps)

#### `autodemo run`

Run a single scenario or all scenarios.

```bash
bun run dev -- run signup --no-tui
bun run dev -- run --all --no-tui
```

Interactive wizard (choose config + scenario + URL + headless):

```bash
bun run dev -- run --interactive
```

Options:
- `--url <url>`: override base URL
- `--outDir <dir>`: override output directory base
- `--headless`: force headless browser (default: headed)
- `--interactive`: open run wizard UI
- `--debug`: save `trace.zip` even on success

Config selection:
- Use the global `--config <path>` flag:

```bash
bun run dev -- run signup --config verber-studio.autodemo.yml --url http://localhost:3010
```

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


