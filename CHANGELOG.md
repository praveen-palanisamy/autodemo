# Changelog

## v0.1.1 — npm scoped package + CI reliability

- **npm**: publish as `@praveen-palanisamy/autodemo` (unscoped `autodemo` blocked by npm similarity policy). CLI command remains `autodemo`.
- **CI**: fix infinite hang when `waitForSelector` omits `timeoutMs` (Playwright treats `undefined` as no timeout).
- **CI**: action smoke test runs only `site-landing` (walkthrough scenario needs a two-pass site build).
- **Branding**: walkthrough footer links product site + npm package; optional video watermark when `output.branding` is enabled.

## v0.1.0 — Public launch

**Demos as code.** First public release of AutoDemo: generate demo videos, interactive walkthroughs, and marketing captures from any running web app — locally, in CI, or from an AI agent.

### Highlights

- **`autodemo demo "<instruction>" --url <url>`** — one-shot AI demo: instruction → scenario → video + walkthrough, no config required. `--save` keeps the scenario for replay.
- **Bring any LLM** — OpenAI, Anthropic, Google, Groq, Ollama/local, or any OpenAI-compatible endpoint (`llm.baseUrl`). Auto-detected from env vars; overridable via config, `AUTODEMO_LLM_*` env, or `--provider`/`--model` flags. Deterministic scenarios need no LLM.
- **One-line installer** — `curl -fsSL …/install.sh | bash` (installs Bun, the CLI, and Chromium).
- **Reusable GitHub Action** (`praveen-palanisamy/autodemo@v0`) — regenerate demos on every merge; config scenarios or one-shot AI instructions; artifact upload built in.
- **MCP server** (`autodemo mcp`) — Cursor / Claude Code / Codex agents can list, generate, and run demos. See `docs/AGENTS.md`.
- **Marketing-grade capture** — dev overlays hidden by default, `videoStartStep` trims setup noise, stable 16:9 record surface, named region captures (`assets/*.png`).
- **Authenticated demos** — reusable Playwright storage state (incl. IndexedDB); login once, demo logged-in flows everywhere.
- **Walkthrough branding** — generated walkthroughs carry a subtle "Made with AutoDemo" footer (`output.branding: false` or `--no-branding` to remove).
- **Product site dogfooding** — the GitHub Pages product page re-records its own demo video and walkthrough on every deploy.

### Core (from pre-release development)

- Scenario DSL (`.autodemo.yml`, Zod-validated): AI `act` steps + deterministic `goto`/`click`/`fill`/`press`/`select`/`hover`/`waitFor*`/`expect*`/`scroll*`/`narrate`/`screenshot` steps, per-step `note`, `capture`, and `asset` extraction.
- Artifacts per run: `video.mp4`, interactive `index.html`, `steps/*.png`, `assets/*.png`, `run.json`, `trace.zip` on failure/`--debug`.
- Ink TUI wizards: `record --interactive` (capture real clicks/typing/scrolls), `run --interactive`.
- Cursor overlay with click rings, human-paced typing, story narration beats.
- `doctor` environment checks (ffmpeg, Chromium, detected LLM provider).
- CI: lint, typecheck, unit + integration tests (Next.js fixture), action smoke test; Pages deploy; npm publish on tag.
