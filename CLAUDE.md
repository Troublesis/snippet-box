# Snippet Box (Troublesis fork) — dev notes

Practical, non-obvious facts for working in this repo. Read the top-level
`/volume1/docker/1panel/docker/compose/CLAUDE.md` first for the 1Panel service
folder conventions (default-ignore rule, host paths, port range, etc.) — this
file covers **this service only**.

## Repo layout & build context (IMPORTANT — this tripped up a previous session)

- The **Docker build context is the repo root on branch `main`** — see
  `docker-compose.yml` (`build: .`) and `Dockerfile`. Commit a4ac586 merged the
  upstream `master` app source (`client/` React frontend + `src/` backend) into
  `main`. **Edit and commit `client/` and `src/` directly on `main`.**
- `.dockerignore` excludes `app/`, `mcp/`, `1panel.env`, `data/`, and
  `client/{node_modules,build}` — but **NOT** `client/` source.
- There is a stale `./app` git **worktree on branch `master`** left over from
  the old layout. It is a duplicate, it is docker-ignored, and **you should NOT
  edit there** — `git add -A` at the top level won't see it. Ignore it.

## Build & deploy (no downtime to the proxy sibling)

```sh
docker compose build snippet-box          # ~3-5 min (CRA build)
docker compose up -d --no-deps snippet-box  # recreates ONLY snippet-box, leaves snippet-mcp running
```

`snippet-mcp` (the Python FastMCP front-door proxy under `./mcp`) owns host port
**10032** and proxies the web UI + REST API to the internal-only `snippet-box`
(exposed 5000). Don't take it down — use `--no-deps`.

- Verify the rebuilt image is live: the served `static/js/*.chunk.js` hashes in
  `http://<nas>:10032/` should change after a rebuild.
- The SPA renders client-side, so you can't `curl` the HTML to verify a
  markdown change — grep the JS chunks for bundled-library markers instead
  (e.g. `tableCell`/`tableRow` for GFM, `CODE_POINTS`/`ParseError` for the
  parse5 HTML parser that `rehype-raw` pulls in). The vendor chunk is `2.*.chunk.js`.

## Build toolchain constraints (the #1 source of build breakage)

`client/` is **create-react-app with `react-scripts@4.0.3` → webpack 4**.

- **Webpack 4 does not transpile `node_modules`**, and its acorn parser cannot
  parse optional chaining (`?.`) or nullish coalescing (`??`). Any dependency
  whose published `dist` uses modern syntax fails the build with
  `Module parse failed: Unexpected token`. Before adding a dep, eyeball its
  shipped JS for `?.`/`??`/`||=`. Stick to the `unified@10` / `hast` /
  `remark`/`rehype` ecosystem generation that already builds here.
- **Mermaid is pinned to v8.x** (`mermaid@8.14.0`, `@types/mermaid@8`). Mermaid
  v9/v10 use modern syntax and break this build. With `@types/mermaid` v8,
  `securityLevel`/`theme` are enums — passing the string `'strict'` is a TS2322
  error. v8 defaults are already `securityLevel:'strict'` + `theme:'default'`,
  so just `mermaid.initialize({ startOnLoad: false })`.
- `Dockerfile` uses `npm install` (not `npm ci`); the client lockfile is v1.
  Add/upgrade deps with `npm install <pkg>@<ver> --save --package-lock-only
  --lockfile-version 1` **inside `client/`**. Run the build itself in Docker —
  there are no `node_modules` on the host.
- The Docker build runs `npm uninstall node-sass && npm install sass --save-dev`
  in `client/` (node-sass doesn't compile on modern Alpine). Don't re-add node-sass.

## Markdown rendering in snippet docs (the file you'll most likely touch)

`client/src/components/Snippets/SnippetDocs.tsx` renders the `docs` field of a
snippet. Pipeline (react-markdown v7):

```
ReactMarkdown
  remarkPlugins={[remarkGfm]}                      # GFM: tables, strikethrough, autolinks, task lists
  rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
  components={{ code, table }}
```

Key facts / gotchas:

- **react-markdown v7 is CommonMark-only by default.** Tables and other GFM
  extensions require the `remark-gfm` plugin — without it, `| a | b |` renders
  as literal pipe text. (`remark-gfm@3` matches the v7 / unified@10 generation.)
- **react-markdown v7 renders embedded HTML as escaped text by default**, but
  it internally hardcodes `allowDangerousHtml: true` at the remark→rehype step
  (see `react-markdown/lib/react-markdown.js`). So raw HTML *reaches* the
  rehype pipeline; `rehype-raw@6` then parses it into real nodes, and
  `rehype-sanitize@5` makes it XSS-safe.
- **`rehype-sanitize`'s default schema strips `className` and `style`.** That
  would silently break mermaid detection (`language-mermaid` class) and syntax
  highlighting. `SnippetDocs.tsx` defines a custom `schema` extending
  `defaultSchema` to allow `className` + `style` on `*`. If you add another
  renderer that depends on element attributes, extend this schema.
- `code` component routes ```` ```mermaid ```` blocks to `<Mermaid>`; other code
  falls through to react-markdown's default. `table` component applies
  Bootstrap's `.table` class for the bootswatch theme.
- Tables wider than the column scroll horizontally via `.snippet-docs table`
  in `client/src/styles/style.scss`.

## Runtime data

SQLite DB at `/volume1/docker/snippet-box/data` (bind-mounted to `/app/data`).
REST API base on the host: `http://<nas>:10032/api/snippets/...` (single snippet
detail is `/api/snippets/<id>`, not `/api/snippet/<id>`).
