# Agent instructions

Guidance for Cursor and other coding agents working in this repository.

## After implementing a feature or fix

1. Ensure the app is in a working state (run relevant scripts: `bun run typecheck`, `bun test`, `bun run site:build` when the site changed).
2. Review all related changes; stage every file that belongs to the work.
3. **Commit with a descriptive message** — do not leave completed feature work uncommitted.
4. Use conventional prefixes when appropriate: `feat:`, `fix:`, `docs:`, `chore:`.

Push only when the user asks. Tags and releases follow the same “working state first, then tag” order.

## Scripts over one-off commands

Prefer idempotent scripts in `scripts/` (and `package.json` aliases) over ad-hoc shell one-liners so CI and local dev stay aligned.

## Production and demos

- Changes must work in production deployment and local Firebase/emulator paths where applicable.
- Demo artifacts under `public/demos/` are regenerated in CI; landing page video uses `data-src` + poster so autodemo captures stay poster-only (`holdEmbeddedVideos` in capture guards).
- npm package: `@praveen-palanisamy/autodemo` (CLI binary name remains `autodemo`).

## Code style

- Modular, SOLID, avoid huge single files.
- Match existing conventions in surrounding code.
- Use mermaid or kroki for diagrams in docs, not ASCII art.
- Do not add `Co-authored-by` lines to commit messages.
