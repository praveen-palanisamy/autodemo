## AutoDemo Developer Docs

This repo contains the OSS `autodemo` CLI (Bun + TypeScript) for generating:
- **Interactive demos** (`index.html` + screenshots + `run.json`)
- Optional **video** (`video.mp4`) via Playwright recording + FFmpeg conversion

### Quick start

```bash
bun install
bun run playwright:install

# Create .autodemo.yml (idempotent)
bun run dev -- init

# Run a scenario
bun run dev -- run <scenario> --no-tui
```

### Docs index

- `docs/CLI.md`: commands, flags, exit codes
- `docs/CONFIG.md`: `.autodemo.yml` schema + examples
- `docs/ARCHITECTURE.md`: module layout + execution flow
- `docs/MCP.md`: MCP server tools + usage
- `docs/TESTING.md`: unit + integration tests, Next.js fixture


