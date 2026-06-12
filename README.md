## AutoDemo

AutoDemo helps to automate generating interactive walkthroughs and demo videos for your web apps and websites using browser automation, optionally powered by your favourite AI models.

AutoDemo turns a web app + a short description into **shareable demo artifacts**:

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

### Quick Start

Install AutoDemo in the app repo you want to capture:

```bash
# Bun
bun add -D autodemo

# npm
npm add -D autodemo

# Install Playwright browsers once
bunx playwright install
```

Create a config and run your app:

```bash
bunx autodemo init
bun run dev # or npm run dev, pnpm dev, etc.
```

Edit `.autodemo.yml` with a deterministic scenario:

```yaml
project:
  name: My App
  baseUrl: http://localhost:3000

output:
  dir: public/demos
  clean: true

browser:
  headless: true
  viewport: { width: 1600, height: 900 }
  recordVideo: true
  capture:
    hideDevOverlays: true
  video:
    recordSize: { width: 1280, height: 720 }
    trimStartBeforeMs: 600
  cursor:
    showCursor: true
    highlightClicks: true
    clickRadius: 36

scenarios:
  signup:
    description: "Show signup with readable typing and click highlights."
    videoStartStep: 1
    steps:
      - type: goto
        url: /signup
      - type: fill
        selector: "[data-autodemo=email]"
        value: "maya@example.com"
        typing: true
        delayMs: 45
      - type: click
        selector: "[data-autodemo=submit]"
      - type: waitForSelector
        selector: "[data-autodemo=dashboard]"
```

Capture one scenario or the full set:

```bash
bunx autodemo run signup --config .autodemo.yml --url http://localhost:3000 --headless
bunx autodemo run --all --config .autodemo.yml --url http://localhost:3000 --headless
```

Outputs are written to `public/demos/<scenario>/latest/`:

- `video.mp4`: normalized MP4 for marketing pages
- `index.html`: static interactive walkthrough
- `steps/*.png`: step screenshots
- `assets/*.png`: named reusable captures
- `run.json`: reproducible metadata and timing

### Local Repo Development

```bash
bun install
bun run playwright:install

# Create .autodemo.yml (idempotent)
bun run dev -- init

# Run a scenario from this repo
bun run dev -- run signup
```

CI/release notes:

- GitHub Actions: `.github/workflows/*`
- Local CI runner (optional): `docs/CI_LOCAL.md` (act + Podman)

---

## How it works

Autodemo `record` command enables recording or generating a scenario file describing what needs to be captured in the demo.

The recording can be done through user/agent live demonstrations or auto generated using a VLM/LLM.

In live user/agent demonstration, the user/agent interacts with the web app/site and the trajectories get recorded automatically using Playwright into a scenario file with deterministic steps (`click`, `fill`, `waitForSelector`, …) for precision and reliability.

In auto mode, based on a desired demo description in natural language, a AI model using Stagehand generates scenarios with `act` steps which can be acted by the AI agent.

For more details, please see:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

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
