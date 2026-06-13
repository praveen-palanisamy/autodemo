# AutoDemo for AI agents

AutoDemo is built to be *agent-operable*: a coding agent that just built or changed a feature can generate visual proof — a demo video, an interactive walkthrough, and screenshots — without a human touching a screen recorder.

Two integration surfaces:

1. **MCP server** (richest): `autodemo mcp`
2. **JSON CLI** (simplest): every command supports `--json` / `--no-tui`

## 1. MCP server

```bash
bunx @praveen-palanisamy/autodemo mcp --no-tui
```

Register it with your agent runtime:

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "autodemo": {
      "command": "bunx",
      "args": ["autodemo", "mcp", "--no-tui"]
    }
  }
}
```

### Claude Code (`claude mcp add`)

```bash
claude mcp add autodemo -- bunx @praveen-palanisamy/autodemo mcp --no-tui
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.autodemo]
command = "bunx"
args = ["autodemo", "mcp", "--no-tui"]
```

Tools exposed (see `docs/MCP.md` for payloads):

- `autodemo.scenarios.list` — discover scenarios in a repo
- `autodemo.scenario.generate` — instruction → runnable scenario YAML
- `autodemo.run` — execute and get artifact paths back

## 2. JSON CLI (no MCP needed)

```bash
# One-shot: instruction → video + walkthrough, machine-readable result
autodemo demo "Sign up and open the dashboard" \
  --url http://localhost:3000 --headless --json

# Deterministic scenarios
autodemo run --all --url http://localhost:3000 --headless --json
```

Exit codes: `0` success · `1` run failure · `2` usage/config error. The JSON result contains `outDir` and artifact paths (`video.mp4`, `index.html`, `run.json`).

## 3. Drop-in rules snippet

Paste into your repo's agent rules (`.cursorrules`, `AGENTS.md`, `CLAUDE.md`) so agents use AutoDemo proactively:

```markdown
## Demos
After completing a user-facing feature, generate a demo with AutoDemo:
- `autodemo demo "<what to show>" --url <dev-server-url> --headless --json`
- Or add a scenario to `.autodemo.yml` and run `autodemo run <name> --headless --json`.
Attach the generated `video.mp4` / walkthrough path to the PR description.
LLM keys are auto-detected from env (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GROQ_API_KEY, OLLAMA_HOST).
```

## 4. Choosing models

AI (`act`) steps run through Stagehand with any provider:

| Provider | Env var | Notes |
| --- | --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` | detected first |
| OpenAI | `OPENAI_API_KEY` | |
| Google | `GOOGLE_API_KEY` / `GEMINI_API_KEY` | |
| Groq | `GROQ_API_KEY` | fast OSS models |
| Ollama / local | `OLLAMA_HOST` | OpenAI-compatible, fully offline |
| Custom (vLLM, LM Studio…) | `llm.baseUrl` in config | OpenAI-compatible endpoint |

Pin per-invocation: `autodemo demo "..." --provider ollama --model llama3.3`, or via `AUTODEMO_LLM_PROVIDER` / `AUTODEMO_LLM_MODEL` env vars, or the `llm:` config section.

Deterministic step types (`click`, `fill`, `waitFor`, …) need **no LLM at all** — ideal for repeatable CI demos.
