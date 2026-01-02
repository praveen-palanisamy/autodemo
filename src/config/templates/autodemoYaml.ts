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
  viewport: { width: 1440, height: 900 }
  # recordVideo:
  # - when true, AutoDemo will attempt to write video.mp4 (requires ffmpeg).
  # - note: some engines/connection modes may fall back to screenshots-only.
  recordVideo: false
  cursor:
    # Show custom cursor overlay in videos/screenshots.
    showCursor: true
    # Options: arrow | hand
    style: arrow
    # Show a click highlight ring
    highlightClicks: true
    # Ring size in px
    clickRadius: 24
  transitions:
    # Delay after each step so the UI/cursor is visible in captures.
    transitionMs: 800
    # Extra pause after the final step (keeps video from ending abruptly).
    endPauseMs: 1200
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
`;
}


