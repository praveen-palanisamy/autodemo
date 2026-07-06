## Fast pre-push check (matches CI `test` job)

Before pushing, run the same gates as the CI lint/typecheck/unit job:

```bash
bun run ci:check
```

Enable the git pre-commit hook once per clone (runs `ci:check` automatically):

```bash
bun run setup:hooks
```

Integration and action-smoke jobs are heavier; run them with `bun run test:integration` or `act` when you touch runner/site/action code.

## Running CI locally (act + Podman)

AutoDemo ships GitHub Actions workflows under `.github/workflows/`.

### Prereqs

- Install [`act`](https://github.com/nektos/act)
- Podman installed (Docker also works)

### Run the CI workflow

From repo root:

```bash
# Show workflows
act -l

# Run CI workflow (uses Podman/Docker container runtime)
act -W .github/workflows/ci.yml
```

### Run the demo update workflow

This workflow generates/updates demo artifacts and commits them (it expects `contents: write` on GitHub; locally it will still run the steps).

```bash
act -W .github/workflows/update-demos.yml
```

Notes:
- Playwright browser install can be slow the first time.
- Video generation requires `ffmpeg` inside the runner image.


