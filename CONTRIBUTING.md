# Contributing to AutoDemo

Thanks for helping make demos-as-code the default. All contributions are welcome: bug reports, docs, scenario recipes, and code.

## 15-minute setup

```bash
git clone https://github.com/praveen-palanisamy/autodemo.git
cd autodemo
bun install
bun run playwright:install   # one-time browser download

# Sanity check
bun run doctor
bun test
```

Requirements: [Bun](https://bun.sh) ≥ 1.3, `ffmpeg` (optional, MP4 export only).

## Day-to-day commands

| Command | What |
| --- | --- |
| `bun run dev -- <cmd>` | Run the CLI from source (e.g. `bun run dev -- run signup`) |
| `bun run test:unit` | Fast unit tests |
| `bun run test:integration` | Integration tests against the Next.js fixture app |
| `bun run lint` / `bun run typecheck` | Static checks (CI gates) |
| `bun run format` | Prettier |
| `bun run site:build && bun run site:serve` | Preview the product site locally |

## What to work on

- [`good first issue`](https://github.com/praveen-palanisamy/autodemo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) — curated starters
- [`help wanted`](https://github.com/praveen-palanisamy/autodemo/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
- **Scenario recipes** — the easiest contribution: a working `.autodemo.yml` snippet for a framework or flow (auth, checkout, onboarding). Open a "Recipe" issue or PR into `docs/RECIPES.md`.

## Pull requests

1. Fork, create a topic branch from `main`.
2. Keep PRs focused and small; add/update tests for behavior changes.
3. `bun run lint && bun run typecheck && bun test` must pass.
4. Update docs (`docs/`, `README.md`) when flags, config, or outputs change.
5. Fill in the PR template; link the issue it fixes.

We aim to review first-time PRs within a few days.

## Project layout (10-second tour)

```
bin/autodemo.ts      CLI entry
src/cli/             commands, Ink TUI, arg parsing
src/config/          .autodemo.yml schema (Zod), LLM resolution
src/engines/         stagehand (AI act) + playwright (deterministic + capture)
src/scenario/        runner (steps → artifacts)
src/output/          run.json, interactive HTML, video pipeline
src/mcp/             MCP server for agents
site/                GitHub Pages product site
tests/               unit + integration (Next.js fixture)
```

Design principles: deterministic capture substrate (Playwright), AI as authoring accelerant (Stagehand), every artifact reproducible from `run.json`, no telemetry.

## Reporting bugs / proposing features

Use the issue templates. For bugs, `autodemo doctor --json` output and a `run.json` (redact secrets) make triage fast.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be excellent to each other.
