## AutoDemo

**Stagehand-first, Bun-first demo automation.**

AutoDemo turns a running web app + a short scenario into **shareable demo artifacts**:
- **Interactive walkthrough** (`index.html` + step screenshots)
- **Run metadata** (`run.json`) for debugging + reproducibility
- Optional **video** (`video.mp4`) with a visible cursor + click rings

Designed for:
- **Builders / solopreneurs**: ship product updates and marketing walkthroughs without re-recording everything.
- **Dev teams**: keep demos in sync with UI changes via CI.
- **Tool-use agents / LLMs**: generate and run demos programmatically via **MCP**.

### Teaser

Click the image to watch the latest generated demo video (from this repo):

[![AutoDemo teaser](public/demos/signup/latest/steps/0001.png)](public/demos/signup/latest/video.mp4)

Or open the interactive demo:
- `public/demos/signup/latest/index.html`

---

### Quick start (this repo)

```bash
bun install
bun run playwright:install

# Create .autodemo.yml (idempotent)
bun run dev -- init

# Run a scenario
bun run dev -- run signup
```

### Install (as a tool)

AutoDemo is **Bun-first**.

```bash
# In your app repo
bun add -D autodemo

# Run
bunx autodemo --help
```

---

## How it works

- **Stagehand-first**: `type: act` steps use Stagehand (LLM-native, self-healing).
- **Playwright fallback**: deterministic steps (`click`, `fill`, `waitForSelector`, …) for precision and reliability.
- **Outputs are static files**: check them into `public/`, upload as artifacts, or publish via GitHub Pages.

See:
- `docs/ARCHITECTURE.md`
- `predev-docs/PRD_AUTODEMO.md` (v0.1 goals/spec)

---

## CLI (human + CI)

Common flows:

```bash
# Run one scenario
bunx autodemo run signup --url http://localhost:3000

# Run all scenarios
bunx autodemo run --all --url http://localhost:3000
```

Interactive mode:

```bash
# Run wizard: pick config + scenario + URL + headless
bunx autodemo run --interactive

# Record interactions in a headed browser
bunx autodemo record --interactive --url http://localhost:3000 --name signup
```

Docs:
- `docs/CLI.md`
- `docs/CONFIG.md`

---

## MCP (for tool-use agents / LLMs)

AutoDemo includes an MCP server over stdio so agents can list/generate/run demos.

```bash
bunx autodemo mcp --no-tui
```

See `docs/MCP.md` for tools and payloads.

---

## Outputs

By default:

- `public/demos/<scenario>/latest/index.html`
- `public/demos/<scenario>/latest/run.json`
- `public/demos/<scenario>/latest/steps/*.png`
- `public/demos/<scenario>/latest/video.mp4` (optional)
- `public/demos/<scenario>/latest/trace.zip` (on failure or `--debug`)

`output.clean: true` keeps `latest/` consistent by deleting the previous folder before writing a new run.

---

## Contributing

```bash
bun test
bun run lint
bun run typecheck
```

Developer docs live in `docs/`.

---

## GitHub repo metadata (copy/paste)

- **Description**: Stagehand-first demo automation CLI. Generate interactive walkthroughs + videos from a running web app. Bun-first, agent-ready via MCP.
- **Tagline**: “Keep demos in sync with your product.”
- **Suggested topics**: `stagehand`, `playwright`, `bun`, `typescript`, `mcp`, `automation`, `demo`, `nextjs`, `cli`, `ink`, `llm-tools`, `agents`


