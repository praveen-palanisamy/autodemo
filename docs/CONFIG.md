## Configuration (`.autodemo.yml`)

AutoDemo loads a single YAML config file (default: `./.autodemo.yml`) and validates it via Zod (`src/config/schema.ts`).

### Minimal example

```yaml
project:
  name: MyApp
  baseUrl: http://localhost:3000

output:
  dir: public/demos
  clean: true

browser:
  headless: false
  viewport: { width: 1600, height: 900 } # 16:9 avoids letterboxing in marketing/video players
  recordVideo: false
  cursor:
    showCursor: true
    style: arrow # arrow | hand
    pointerColor: "#0076FF"
    clickColor: "#0076FF"
    highlightClicks: true
    clickRadius: 24
  transitions:
    transitionMs: 800 # delay after each step (UI settle + video pacing)
    endPauseMs: 1200 # extra pause after final step (video tail)
  capture:
    hideDevOverlays: true # hide Next.js/Vite/Webpack dev overlays in product demos
  video:
    recordSize: { width: 1280, height: 720 } # stable raw recorder surface
    trimStartBeforeMs: 600

auth:
  # Optional Playwright storage state for authenticated demos.
  # Keep these files ignored because they may contain session tokens.
  statePath: .autodemo/state/local.json
  saveState: false

recording:
  # Only used by: `autodemo record --interactive`
  events: ["click", "fill", "scroll"]
  scrollThrottleMs: 300

scenarios:
  signup:
    description: "Signup flow"
    videoStartStep: 1
    steps:
      - type: goto
        url: /signup
      - type: fill
        selector: "[data-testid=email]"
        value: "demo@example.com"
        typing: true
        delayMs: 45
      - type: fill
        selector: "[data-testid=password]"
        value: "password"
      - type: click
        selector: "[data-testid=signup-button]"
      - type: waitFor
        text: "Dashboard"
      - type: screenshot
        name: dashboard-card
        selector: "[data-autodemo=dashboard-card]"
        note: "Capture reusable marketing card"
```

### Step types

Stagehand-first:

- `act`: `instruction: string`

Playwright fallback:

- `click`: `selector: string`
- `fill`: `selector: string`, `value: string`, optional `typing: true`, optional `delayMs`
- `hover`: `selector: string`
- `press`: `key: string`, optional `selector`
- `select`: `selector: string`, `values: string[]`
- `waitForSelector`: `selector: string`, optional `timeoutMs`
- `waitFor`: `text: string`, optional `timeoutMs`
- `expectVisible`: `selector: string`, optional `timeoutMs`
- `expectText`: `selector: string`, `text: string`
- `sleep`: `ms: number`
- `goto`: `url: string` (relative or absolute)
- `scrollTo`: `y: number` (scroll Y offset in px), optional `behavior: smooth`, optional `durationMs`
- `scrollIntoView`: `selector: string`, optional `behavior`, optional `block`
- `narrate`: `text: string`, optional `ms` (temporary on-screen story caption)
- `screenshot`: `name: string`, optional `selector`, optional `fullPage`

Common optional fields:

- `note`: shown in the interactive demo
- `capture: false`: disables screenshot capture for that step
- `asset`: `{ name, selector?, fullPage? }`, emits a named PNG under `assets/<name>.png` after the step succeeds

Scenario optional fields:

- `videoStartStep`: trims the final MP4 so it starts shortly before this step. Use it to remove login/auth setup, page-load spinners, or first-run framework noise while preserving the deterministic setup steps.

### Stagehand config

AutoDemo supports Stagehand steps via `type: act`.

Notes:

- Stagehand’s upstream docs recommend **Node** over Bun for maximum Playwright compatibility; we still run under **Bun** by default.
- If you run `act` steps, you’ll typically need an LLM provider key (e.g., `OPENAI_API_KEY`) available in your environment.

### Cursor overlay (videos/screenshots)

`browser.cursor` controls the custom pointer overlay that is visible in screenshots and videos (headless or headed):

- `showCursor`: show a synthetic pointer so the cursor is visible in recordings.
- `style`: `arrow | hand`.
- `pointerColor`: pointer hex color (`#RRGGBB`).
- `clickColor`: click ring hex color (`#RRGGBB`).
- `highlightClicks`: draw a ring on click.
- `clickRadius`: ring radius in px.

### Auth state (`auth`)

`auth.statePath` points to a Playwright storage state file. When the file exists, AutoDemo loads it before the first step. When `auth.saveState: true`, AutoDemo writes the browser state after a successful run.

Use this for reproducible authenticated product demos:

```yaml
auth:
  statePath: .autodemo/state/verber-studio.local.json
  saveState: true
```

State files may contain cookies and local storage tokens, so keep them under ignored paths.

### Named marketing captures

Use `type: screenshot` when a scenario needs to produce a reusable asset without performing an interaction:

```yaml
- type: screenshot
  name: brand-dna-panel
  selector: "[data-autodemo=brand-dna-panel]"
  capture: false
  note: "Brand DNA panel for homepage composition"
```

Use `asset` on an interaction step when the capture should happen immediately after a click/fill/wait:

```yaml
- type: waitFor
  text: "Campaign ready"
  asset:
    name: campaign-output
    selector: "[data-autodemo=campaign-output]"
```

Named captures are written to `output.dir/<scenario>/latest/assets/*.png` and referenced in `run.json`.

### Step pacing / video feel (`browser.transitions`)

AutoDemo intentionally waits between steps so screenshots and video feel human-paced:

- `transitionMs`: applied after each step (including `act` and fallback steps).
- `endPauseMs`: applied after the last step (useful when producing video so it doesn’t “hard cut”).

### Capture quality (`browser.capture` and `browser.video`)

- `browser.capture.hideDevOverlays` defaults to `true`. It hides common framework overlays such as Next.js dev indicators, Vite overlays, and Webpack dev-server overlays. Set it to `false` only when the demo is intentionally documenting a debug workflow.
- `browser.video.recordSize` defaults to `1280x720`. Playwright’s raw recorder is most stable at a conventional 16:9 surface; AutoDemo then normalizes the final MP4 to `browser.viewport`.
- `browser.video.trimStartBeforeMs` controls the small lead-in retained before `videoStartStep`.

### Interactive recording capture (`recording`)

These knobs only affect `autodemo record --interactive`:

- `events`: which interactions to capture (`click`, `fill`, `scroll`).
- `scrollThrottleMs`: scroll sampling throttle; higher values reduce noise.

### `output.clean`

When `output.clean: true`, AutoDemo **deletes the previous output folder for the scenario** before writing a new run:

- `output.dir/<scenario>/latest`

This keeps `latest/` consistent and avoids stale screenshots/videos lingering between runs.
