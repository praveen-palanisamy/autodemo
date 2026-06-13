import { BRAND, brandingFooterHtml } from "../../branding/constants.ts";

export function generateInteractiveHtml(opts?: { branding?: boolean }): string {
  const branding = opts?.branding ?? true;
  // Single static file that loads run.json and displays step screenshots.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${BRAND.name}</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; }
      header { padding: 12px 16px; border-bottom: 1px solid rgba(128,128,128,0.3); display: flex; gap: 12px; align-items: baseline; }
      header h1 { font-size: 16px; margin: 0; }
      header .meta { opacity: 0.7; font-size: 12px; }
      main { display: grid; grid-template-columns: 1fr 360px; gap: 16px; padding: 16px; }
      .frame { border: 1px solid rgba(128,128,128,0.3); border-radius: 10px; overflow: hidden; background: rgba(128,128,128,0.06); }
      .frame img { width: 100%; height: auto; display: block; background: #000; }
      .panel { border: 1px solid rgba(128,128,128,0.3); border-radius: 10px; padding: 12px; }
      .row { display: flex; gap: 8px; flex-wrap: wrap; }
      button { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(128,128,128,0.4); background: transparent; cursor: pointer; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .steps { margin-top: 12px; max-height: calc(100vh - 220px); overflow: auto; font-size: 12px; }
      .step { padding: 8px; border-radius: 8px; cursor: pointer; }
      .step[aria-current="true"] { background: rgba(100,140,255,0.18); }
      .step .t { font-weight: 600; }
      .step .s { opacity: 0.75; }
      .note { margin-top: 8px; opacity: 0.9; font-size: 13px; }
      .branding { padding: 8px 16px; text-align: center; font-size: 11px; opacity: 0.6; }
      .branding a { color: inherit; text-decoration: none; }
      .branding a:hover { text-decoration: underline; }
      @media (max-width: 980px) { main { grid-template-columns: 1fr; } .steps { max-height: 240px; } }
    </style>
  </head>
  <body>
    <header>
      <h1 id="title">${BRAND.name}</h1>
      <div class="meta" id="meta"></div>
    </header>
    <main>
      <div class="frame">
        <img id="img" alt="Step screenshot" />
      </div>
      <div class="panel">
        <div class="row">
          <button id="prev">Prev</button>
          <button id="next">Next</button>
          <button id="restart">Restart</button>
        </div>
        <div class="note" id="note"></div>
        <div class="steps" id="steps" role="list"></div>
      </div>
    </main>${branding ? brandingFooterHtml() : ""}
    <script>
      const state = { run: null, idx: 0 };
      const $ = (id) => document.getElementById(id);

      function render() {
        const run = state.run;
        if (!run) return;
        const step = run.steps[state.idx];

        $("title").textContent = run.project.name + " — " + run.scenario.name;
        $("meta").textContent = \`\${state.idx + 1}/\${run.steps.length} • \${step.type} • \${run.status}\`;
        $("note").textContent = step.note || step.instruction || step.selector || step.url || step.text || "";

        $("prev").disabled = state.idx <= 0;
        $("next").disabled = state.idx >= run.steps.length - 1;

        if (step.screenshotPath) $("img").src = step.screenshotPath;
        else $("img").removeAttribute("src");

        const stepsEl = $("steps");
        stepsEl.innerHTML = "";
        run.steps.forEach((s, i) => {
          const el = document.createElement("div");
          el.className = "step";
          el.setAttribute("role", "listitem");
          el.setAttribute("tabindex", "0");
          el.setAttribute("aria-current", i === state.idx ? "true" : "false");
          el.innerHTML = \`<div class="t">\${String(i + 1).padStart(2, "0")} • \${s.type}</div><div class="s">\${s.status}</div>\`;
          el.addEventListener("click", () => { state.idx = i; render(); });
          el.addEventListener("keydown", (e) => { if (e.key === "Enter") { state.idx = i; render(); }});
          stepsEl.appendChild(el);
        });
      }

      function next() { state.idx = Math.min(state.idx + 1, state.run.steps.length - 1); render(); }
      function prev() { state.idx = Math.max(state.idx - 1, 0); render(); }
      function restart() { state.idx = 0; render(); }

      $("next").addEventListener("click", next);
      $("prev").addEventListener("click", prev);
      $("restart").addEventListener("click", restart);

      window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
        if (e.key === "Home") restart();
      });

      fetch("./run.json")
        .then((r) => r.json())
        .then((run) => { state.run = run; render(); })
        .catch((e) => { console.error(e); $("meta").textContent = "Failed to load run.json"; });
    </script>
  </body>
</html>`;
}


