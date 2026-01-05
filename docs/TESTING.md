## Testing

### Unit tests

Run:

```bash
bun test tests/unit
```

### Integration / e2e tests

We ship a minimal Next.js fixture app at `tests/integration/fixtures/next-app`.

Run:

```bash
# Installs browsers into Playwright cache
bun run playwright:install

# Runs integration tests:
bun test tests/integration
```

What the integration test does:
- starts the Next.js fixture app on a free port
- writes a temporary `.autodemo.yml`
- runs `autodemo run` against the fixture
- verifies `run.json` and screenshots exist

### Debugging failed runs

- Look for `trace.zip` in the scenario output folder (on failure, or if `--debug`).
- Look for run logs in `logs/` (timestamped files).


