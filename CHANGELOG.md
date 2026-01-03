## Changelog

### Unreleased

- **Interactive recording stop behavior**:
  - Ctrl+C during recording → recording stops + partial steps are saved + UI shows saved scenario + log path.
  - Recording stops on:
    - Browser disconnect (`browser_closed`)
    - Context close (`context_closed`)
    - All pages closed (`all_pages_closed`)
    - Stop & Save button (`stop_button`)
    - Ctrl+C (`sigint`)
- **Interactive run wizard**: `autodemo run --interactive` lets you pick config + scenario + URL + headless.
- **Recording selector quality**: prefer `data-testid`, `id`, `name`, `placeholder`, text/role; avoids invalid Tailwind class selectors; adds `note` for human readability.
- **Run UX**: shows concise error summaries and prints full artifact paths on their own lines.


