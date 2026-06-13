#!/usr/bin/env bash
# AutoDemo one-line installer (macOS / Linux / WSL)
#
#   curl -fsSL https://raw.githubusercontent.com/praveen-palanisamy/autodemo/main/install.sh | bash
#
# What it does (idempotent):
#   1. Installs Bun if missing (the AutoDemo runtime)
#   2. Installs the `autodemo` CLI globally
#   3. Installs the Playwright Chromium browser
#   4. Checks for ffmpeg (needed for MP4 export) and prints install hints
#
# Environment overrides:
#   AUTODEMO_VERSION=0.1.0   pin a specific version (default: latest)

set -euo pipefail

VERSION="${AUTODEMO_VERSION:-latest}"
BOLD=$(tput bold 2>/dev/null || true)
DIM=$(tput dim 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)

say() { printf '%s\n' "${1}"; }
step() { say "${BOLD}==> ${1}${RESET}"; }

case "$(uname -s)" in
  Darwin | Linux) ;;
  *)
    say "This installer supports macOS, Linux, and WSL."
    say "On Windows, use PowerShell:  npm install -g @praveen-palanisamy/autodemo && npx playwright install chromium"
    exit 1
    ;;
esac

# 1. Bun runtime
if ! command -v bun >/dev/null 2>&1; then
  step "Installing Bun (AutoDemo runtime)"
  curl -fsSL https://bun.sh/install | bash
  # Make bun available in this shell session.
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
else
  step "Bun found: $(bun --version)"
fi

# 2. AutoDemo CLI
step "Installing @praveen-palanisamy/autodemo (${VERSION})"
if [ "$VERSION" = "latest" ]; then
  bun add -g "@praveen-palanisamy/autodemo"
else
  bun add -g "@praveen-palanisamy/autodemo@${VERSION}"
fi

# 3. Playwright Chromium
step "Installing Playwright Chromium (one-time)"
bunx playwright install chromium

# 4. ffmpeg check (optional, for MP4 export)
if command -v ffmpeg >/dev/null 2>&1; then
  step "ffmpeg found"
else
  say ""
  say "${BOLD}Optional:${RESET} ffmpeg not found — needed only for MP4 video export."
  if [ "$(uname -s)" = "Darwin" ]; then
    say "  brew install ffmpeg"
  else
    say "  sudo apt-get install -y ffmpeg   # Debian/Ubuntu"
    say "  sudo dnf install -y ffmpeg       # Fedora"
  fi
fi

say ""
say "${BOLD}AutoDemo installed.${RESET} Try it against any running web app:"
say ""
say "  ${BOLD}autodemo demo \"Sign up and open the dashboard\" --url http://localhost:3000${RESET}"
say ""
say "${DIM}AI steps auto-detect ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_API_KEY / GROQ_API_KEY / OLLAMA_HOST.${RESET}"
say "${DIM}Deterministic scenarios need no LLM at all: autodemo init && autodemo run <scenario>${RESET}"
say "${DIM}Docs: https://praveen-palanisamy.github.io/autodemo/${RESET}"
