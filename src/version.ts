/**
 * Single source of truth for the CLI version.
 *
 * This is intentionally a plain constant (vs reading package.json at runtime)
 * so it works reliably across Bun/Node packaging and in GitHub Actions.
 *
 * Release tooling updates this file alongside package.json.
 */
export const VERSION = "0.1.0";


