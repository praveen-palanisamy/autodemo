# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x (latest) | ✅ |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting:
**Security tab → Report a vulnerability** on
[praveen-palanisamy/autodemo](https://github.com/praveen-palanisamy/autodemo/security/advisories/new).

You can expect an acknowledgement within 72 hours and a fix or mitigation plan
within 14 days for confirmed issues.

## Scope notes for AutoDemo users

- **Auth state files** (`auth.statePath`) contain session cookies/tokens. They
  are written under gitignored paths by default — keep them out of version
  control and CI logs.
- **`run.json` redaction**: AutoDemo never writes environment variable values
  into artifacts. If you find a leak path, that is a vulnerability — report it.
- **LLM keys** are read from env vars and passed only to the configured
  provider endpoint. The CLI sends no telemetry.
- **MCP server** binds to stdio only; it never opens network ports.
