# GitHub Action

Regenerate demos in CI on every merge — so they can never go stale.

## Quick start

```yaml
# .github/workflows/demos.yml
name: demos
on:
  push:
    branches: [main]

jobs:
  demos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Start your app however you normally do.
      - run: npm ci && npm run build && (npm run start &)
      - run: npx wait-on http://localhost:3000

      - uses: praveen-palanisamy/autodemo@v0
        with:
          url: http://localhost:3000
```

That runs every scenario in your `.autodemo.yml` headlessly, converts videos with ffmpeg, and uploads everything as a workflow artifact.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `url` | — (required) | Base URL of the running app |
| `scenario` | `all` | One scenario name, or `all` |
| `config` | `.autodemo.yml` | Config file path |
| `instruction` | — | One-shot AI demo instead of config scenarios (needs an LLM key in `env`) |
| `output-dir` | config `output.dir` | Override the artifacts directory |
| `upload-artifacts` | `true` | Upload artifacts via `actions/upload-artifact` |
| `artifact-name` | `autodemo-artifacts` | Artifact name |

## Outputs

| Output | Description |
| --- | --- |
| `output-dir` | Directory containing generated artifacts |

## Recipes

### One-shot AI demo on a preview deployment

```yaml
- uses: praveen-palanisamy/autodemo@v0
  with:
    url: ${{ steps.deploy.outputs.preview-url }}
    instruction: "Sign in with the demo account and tour the new dashboard"
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Commit refreshed demos back to the repo

```yaml
- uses: praveen-palanisamy/autodemo@v0
  with:
    url: http://localhost:3000
    upload-artifacts: "false"
- run: |
    git config user.name "autodemo-bot"
    git config user.email "autodemo-bot@users.noreply.github.com"
    git add -f public/demos && git commit -m "chore: refresh demos" && git push || true
```

### Demos as smoke tests

`autodemo run --all` exits non-zero when any scenario fails, so the workflow fails when a core user flow breaks. Your demo is your regression test.

## Notes

- **`@v0` vs npm versions** — `uses: praveen-palanisamy/autodemo@v0` resolves the **git tag** `v0` (floating major pointer to the latest stable release). It is unrelated to npm publish tags. Pin a specific release with `@v0.1.1` or a commit SHA. npm packages are published only on semver tags like `v0.1.1` (`@praveen-palanisamy/autodemo`).
- The action installs its own Bun runtime, Playwright Chromium, and ffmpeg on the runner.
- Authenticated demos: restore an `auth.statePath` file from a secret/cache before the action step, or run a `login` scenario first (see `docs/CONFIG.md`).
- AI (`act`) steps need an LLM key in `env`; deterministic scenarios need none.
