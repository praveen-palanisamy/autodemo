export function defaultAutodemoYamlTemplate(): string {
  // Keep this human-first. This file is intended to be edited by developers.
  return `# AutoDemo configuration
#
# Quick start:
# - Start your app (e.g. Next.js): \`bunx next dev --turbo\`
# - Run a scenario: \`bunx autodemo run signup --url http://localhost:3000\`
#
# Notes:
# - output.clean: true deletes the previous \`<output.dir>/<scenario>/latest\` folder before writing new artifacts.
# - type: act steps require an LLM API key (e.g. OPENAI_API_KEY) and Stagehand config.

project:
  name: MyApp
  # baseUrl must point at a RUNNING app.
  # For Next.js default dev server: http://localhost:3000
  baseUrl: http://localhost:3000

output:
  # Where demo artifacts are written.
  # For Next.js, putting this under \`public/\` makes it easy to serve.
  dir: public/demos
  # If true, clean the scenario's output folder before writing a new run.
  clean: true

browser:
  # Default headed so you can see the demo; pass --headless for CI.
  headless: false
  # Prefer 16:9 for demo videos that embed cleanly in marketing pages.
  viewport: { width: 1600, height: 900 }
  # recordVideo:
  # - when true, AutoDemo will attempt to write video.mp4 (requires ffmpeg).
  # - note: some engines/connection modes may fall back to screenshots-only.
  recordVideo: false
  cursor:
    # Show custom cursor overlay in videos/screenshots.
    showCursor: true
    # Options: arrow | hand
    style: arrow
    # Hex color for the pointer icon (e.g. #0076FF)
    pointerColor: "#0076FF"
    # Hex color for click ring highlight
    clickColor: "#0076FF"
    # Show a click highlight ring
    highlightClicks: true
    # Ring size in px
    clickRadius: 36
  transitions:
    # Delay after each step so the UI/cursor is visible in captures.
    transitionMs: 800
    # Extra pause after the final step (keeps video from ending abruptly).
    endPauseMs: 1200
  capture:
    # Hide framework/debug overlays such as Next.js dev indicators in demos.
    hideDevOverlays: true
  video:
    # Stable raw Playwright recording surface. Final MP4 is normalized to browser.viewport.
    recordSize: { width: 1280, height: 720 }
    # When a scenario sets videoStartStep, keep this much lead-in before that step.
    trimStartBeforeMs: 600

# Optional Playwright storage state for authenticated demos.
# Keep these files ignored because they may contain session tokens.
auth:
  statePath: .autodemo/state/local.json
  saveState: false

# Hints:
# - Interactive record: bun run dev -- record --interactive --url http://localhost:3000 --name signup
#   Close the opened browser window to save your recording.
# - Non-interactive record (LLM act): bun run dev -- record --url http://localhost:3000 --instruction "..." --name signup

# Stagehand is used for \`type: act\` steps (LLM-native).
llm:
  provider: openai # openai | anthropic | ollama
  model: gpt-4o-mini
  apiKeyEnv: OPENAI_API_KEY

stagehand:
  mode: local # local | browserbase
  browserbaseApiKeyEnv: BROWSERBASE_API_KEY

# Add your scenarios here.
# Tip: Use \`autodemo record\` to generate a starter scenario from an instruction.
scenarios: {}

# Recording settings (for \`autodemo record --interactive\`)
recording:
  # Events to capture (click, fill, scroll)
  events: [click, fill, scroll]
  scrollThrottleMs: 300
`;
}
