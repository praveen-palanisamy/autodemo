# CLI

All commands support:

- `--config <path>`: path to `.autodemo.yml` (default: `./.autodemo.yml`)
- `--tui`: force Ink UI (useful if your environment doesn't report TTY correctly)
- `--no-tui`: disable Ink UI (auto-enabled in CI / non-TTY)
- `--json`: machine-readable JSON output (implies `--no-tui`)
- `--help` / `-h`: show help

> Examples use `autodemo` (global install). Zero-install works too: `bunx autodemo …` / `npx autodemo …`.
> Contributing to this repo? Use `bun run dev -- <command>` to run from source.

## Commands

### `autodemo demo` — one-shot AI demo (no config needed)

Instruction in, artifacts out. The fastest path from a running app to a shareable demo:

```bash
autodemo demo "Sign up and open the dashboard" --url http://localhost:3000
```

Writes `video.mp4`, an interactive `index.html` walkthrough, screenshots, and `run.json`
(into `.autodemo-out/<name>/latest/` when no config exists, else your config's `output.dir`).

Options:

- `--url <url>`: app to demo (required unless config has `project.baseUrl`)
- `--name <name>`: scenario name (default: `demo`)
- `--provider <p>`: `openai | anthropic | google | groq | ollama | custom`
- `--model <m>`: model id (provider default otherwise)
- `--headless`: run the browser headless (default: headed so you can watch)
- `--no-video`: skip MP4 conversion (faster)
- `--save`: persist the generated scenario into `.autodemo.yml` for replay/CI

LLM selection: auto-detected from `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`/`GEMINI_API_KEY`, `GROQ_API_KEY`, or `OLLAMA_HOST` — or pinned via flags, `AUTODEMO_LLM_*` env vars, or the `llm:` config section.

### `autodemo init`

Creates `.autodemo.yml` if missing and ensures `output.dir` exists. Idempotent.

### `autodemo record`

Generate/update a scenario from a natural-language instruction **or** record real interactions in a headed browser.

- **Non-interactive (instruction → act step)**:

```bash
autodemo record --url http://localhost:3000 --instruction "Sign up and open dashboard" --name signup
```

- **Interactive (capture clicks/typing)**:

```bash
autodemo record --interactive --url http://localhost:3000 --name signup --out .autodemo.yml
```

You can also omit flags and use the Ink wizard: `autodemo record`

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

### `autodemo run`

Run a single scenario or all scenarios.

```bash
autodemo run signup --no-tui
autodemo run --all --no-tui
```

Interactive wizard (choose config + scenario + URL + headless):

```bash
autodemo run --interactive
```

Options:

- `--url <url>`: override base URL
- `--outDir <dir>`: override output directory base
- `--headless`: force headless browser (default: headed)
- `--interactive`: open run wizard UI
- `--debug`: save `trace.zip` even on success
- `--no-branding`: omit the "Made with AutoDemo" footer from generated walkthroughs
  (also configurable via `output.branding: false`)

Config selection:

```bash
autodemo run signup --config my-app.autodemo.yml --url http://localhost:3010
```

### `autodemo doctor`

Checks local dependencies and prints actionable fixes:

- `ffmpeg` (MP4 export)
- Playwright Chromium launch
- Detected LLM provider (informational — deterministic scenarios need none)

### `autodemo mcp`

Starts an MCP server over stdio for agent tooling. See `docs/MCP.md` and `docs/AGENTS.md`.

## Exit codes

- `0`: success
- `1`: run failure
- `2`: usage/config error (invalid args or invalid `.autodemo.yml`)
