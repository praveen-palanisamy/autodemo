## Architecture

AutoDemo is a Bun + TypeScript CLI that runs scenarios against a target web app and emits static demo artifacts.

### High-level flow

```mermaid
flowchart TD
  CLI[CLI / Ink TUI] --> CFG[Load + validate .autodemo.yml]
  CFG --> RUN[Scenario runner]
  RUN -->|act| SH[Stagehand executor]
  RUN -->|fallback steps| PW[Playwright executor]
  RUN --> CAP[Capture screenshots]
  RUN --> OUT[Write artifacts]
  OUT --> HTML[index.html (interactive)]
  OUT --> JSON[run.json]
  OUT --> STEPS[steps/*.png]
  OUT --> VID[video.mp4 (optional)]
  OUT --> TRACE[trace.zip (on failure or --debug)]
```

### Key modules

- **Config**: `src/config/*`
  - `schema.ts`: Zod schema for `.autodemo.yml`
  - `loadConfig.ts`: YAML parsing + validation
- **Runner**: `src/scenario/runner.ts`
  - Creates Playwright session (video/tracing)
  - Executes steps via Stagehand (`act`) or Playwright fallback
  - Captures screenshot per step
  - Writes `run.json` and `index.html`
- **Executors**
  - Stagehand: `src/engines/stagehand/*`
  - Playwright: `src/engines/playwright/*`
- **Output**
  - `src/output/*` (interactive HTML, run.json, video conversion)
- **MCP**
  - `src/mcp/server.ts` exposes tools over stdio


