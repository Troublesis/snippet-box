### Fork changes (Troublesis/snippet-box)

Changes layered on top of upstream `pawelmalak/snippet-box`. Newer entries first.

#### Unreleased (2026-07)
- **Docs: render inline HTML in snippet docs** — `<br>`, `<span style="…">`, `<kbd>`, etc. now render as real HTML instead of escaped text. XSS-safe via `rehype-sanitize` with a custom schema that preserves `className` (needed for mermaid / syntax-highlight detection) and `style`.
- **Docs: render GFM tables** — GitHub-style pipe tables (`| col | col |`) now render as styled, horizontally-scrollable tables. Added `remark-gfm` (react-markdown v7 is CommonMark-only by default) plus Bootstrap `.table` styling.
- Architecture: single front-door proxy — `snippet-mcp` serves both the web UI/REST API and `/mcp` on one host port (10032).

#### 2026-06
- Docs: Mermaid diagram rendering in snippet docs (```` ```mermaid ```` blocks). Mermaid pinned to v8.x for webpack-4 compatibility (see CLAUDE.md).
- Build: made the Docker image buildable on modern Node/Alpine.
- UI: sort dropdown + sort-direction dropdown on the Snippets page.
- Search: language and tag filters are now case-insensitive.

---

### v1.4 (2021-10-14)
- Added search functionality ([#18](https://github.com/pawelmalak/snippet-box/issues/18))
- Fixed date parsing bug ([#22](https://github.com/pawelmalak/snippet-box/issues/22))
- Minor UI fixes

### v1.3.1 (2021-10-05)
- Added support for raw snippets ([#15](https://github.com/pawelmalak/snippet-box/issues/15))

### v1.3 (2021-09-30)
- Added dark mode ([#7](https://github.com/pawelmalak/snippet-box/issues/7))
- Added syntax highlighting ([#14](https://github.com/pawelmalak/snippet-box/issues/14))

### v1.2 (2021-09-28)
- Added support for tags ([#10](https://github.com/pawelmalak/snippet-box/issues/10))

### v1.1 (2021-09-24)
- Added pin icon directly to snippet card ([#4](https://github.com/pawelmalak/snippet-box/issues/4))
- Fixed issue with copying snippets ([#6](https://github.com/pawelmalak/snippet-box/issues/6))

### v1.0 (2021-09-23)
Initial release