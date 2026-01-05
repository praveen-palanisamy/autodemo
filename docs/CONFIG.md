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
  viewport: { width: 1440, height: 900 }
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

recording:
  # Only used by: `autodemo record --interactive`
  events: ["click", "fill", "scroll"]
  scrollThrottleMs: 300

scenarios:
  signup:
    description: "Signup flow"
    steps:
      - type: goto
        url: /signup
      - type: fill
        selector: "[data-testid=email]"
        value: "demo@example.com"
      - type: fill
        selector: "[data-testid=password]"
        value: "password"
      - type: click
        selector: "[data-testid=signup-button]"
      - type: waitFor
        text: "Dashboard"
```

### Step types

Stagehand-first:
- `act`: `instruction: string`

Playwright fallback:
- `click`: `selector: string`
- `fill`: `selector: string`, `value: string`
- `hover`: `selector: string`
- `press`: `key: string`, optional `selector`
- `select`: `selector: string`, `values: string[]`
- `waitForSelector`: `selector: string`, optional `timeoutMs`
- `waitFor`: `text: string`, optional `timeoutMs`
- `expectVisible`: `selector: string`, optional `timeoutMs`
- `expectText`: `selector: string`, `text: string`
- `sleep`: `ms: number`
- `goto`: `url: string` (relative or absolute)
- `scrollTo`: `y: number` (scroll Y offset in px)

Common optional fields:
- `note`: shown in the interactive demo
- `capture: false`: disables screenshot capture for that step

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

### Step pacing / video feel (`browser.transitions`)

AutoDemo intentionally waits between steps so screenshots and video feel human-paced:
- `transitionMs`: applied after each step (including `act` and fallback steps).
- `endPauseMs`: applied after the last step (useful when producing video so it doesn’t “hard cut”).

### Interactive recording capture (`recording`)

These knobs only affect `autodemo record --interactive`:
- `events`: which interactions to capture (`click`, `fill`, `scroll`).
- `scrollThrottleMs`: scroll sampling throttle; higher values reduce noise.

### `output.clean`

When `output.clean: true`, AutoDemo **deletes the previous output folder for the scenario** before writing a new run:

- `output.dir/<scenario>/latest`

This keeps `latest/` consistent and avoids stale screenshots/videos lingering between runs.


