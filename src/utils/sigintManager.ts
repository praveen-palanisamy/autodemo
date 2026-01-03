let installed = false;
let currentAbort: AbortController | null = null;

export function installSigintManager(): void {
  if (installed) return;
  installed = true;
  process.on("SIGINT", () => {
    if (currentAbort && !currentAbort.signal.aborted) {
      currentAbort.abort();
      // Do not exit here; let the active operation flush/save.
      return;
    }
    // Default behavior when nothing is running.
    process.exit(130);
  });
}

export function setSigintAbortController(ctrl: AbortController | null): void {
  currentAbort = ctrl;
}


