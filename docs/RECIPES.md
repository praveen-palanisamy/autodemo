# Scenario recipes

Copy-paste starting points for common demos. Contribute yours via the
["Scenario recipe" issue template](https://github.com/praveen-palanisamy/autodemo/issues/new/choose) — merged recipes get credited here.

## Signup flow with readable typing (any framework)

```yaml
scenarios:
  signup:
    description: "Signup with human-paced typing and click highlights"
    steps:
      - type: goto
        url: /signup
      - type: fill
        selector: "[data-testid=email]"
        value: "maya@example.com"
        typing: true
        delayMs: 45
      - type: fill
        selector: "[data-testid=password]"
        value: "demo-password"
      - type: click
        selector: "[data-testid=submit]"
      - type: waitFor
        text: "Dashboard"
```

## Authenticated product tour (login once, reuse state)

```yaml
auth:
  statePath: .autodemo/state/local.json
  saveState: true

scenarios:
  login: # run this first (or when auth expires)
    description: "Refresh auth state"
    steps:
      - type: goto
        url: /login
      - type: fill
        selector: "[data-testid=email]"
        value: "demo@example.com"
      - type: fill
        selector: "[data-testid=password]"
        value: "demo-password"
      - type: click
        selector: "[data-testid=login]"
      - type: waitFor
        text: "Welcome"

  dashboard-tour: # reuses saved state; starts logged in
    description: "Tour the dashboard as a logged-in user"
    videoStartStep: 1
    steps:
      - type: goto
        url: /dashboard
      - type: narrate
        text: "Everything in one place"
      - type: scrollIntoView
        selector: "[data-testid=analytics]"
        behavior: smooth
```

## AI-authored demo with a local model (no API key)

```bash
# Pull a model once: ollama pull llama3.3
OLLAMA_HOST=http://localhost:11434/v1 \
  autodemo demo "Create a new project called Acme and open it" \
  --url http://localhost:3000 --provider ollama --model llama3.3
```

## Marketing stills for a homepage (no video)

```yaml
browser:
  recordVideo: false

scenarios:
  homepage-assets:
    description: "Named captures for the marketing site"
    steps:
      - type: goto
        url: /dashboard
      - type: screenshot
        name: dashboard-hero
        selector: "[data-testid=dashboard-card]"
        note: "Hero image for the landing page"
      - type: goto
        url: /reports
        asset:
          name: reports-full
          fullPage: true
```

Captures land in `<output.dir>/<scenario>/latest/assets/*.png`, referenced from `run.json`.

## Story-driven launch video

```yaml
scenarios:
  launch:
    description: "60-second launch video with narration beats"
    videoStartStep: 1
    story:
      title: "Meet Acme Projects"
      persona: "Busy team lead"
      goal: "From signup to first shipped report"
    steps:
      - type: goto
        url: /
      - type: narrate
        text: "Meet Acme — projects without the busywork"
      - type: act
        instruction: "Sign up with a new account"
      - type: narrate
        text: "Your first project in seconds"
      - type: act
        instruction: "Create a project named Launch Plan"
      - type: waitFor
        text: "Launch Plan"
```

## Tips for great captures

- Add `data-testid` / `data-autodemo` attributes to key elements — deterministic selectors beat brittle text matching.
- Use a 16:9 `viewport` (e.g. 1600×900) so videos embed without letterboxing.
- `videoStartStep` trims login/setup noise from the final MP4 while keeping the steps reproducible.
- Seed demo data before recording; demos should never depend on yesterday's database.
