---
name: verify
description: This skill should be used to verify changes to Visual Math Lab (Quarto site, OJS cells, site includes, the vendored mathviz extension) actually work, before committing. Covers both pure-function regressions and browser-runtime errors that quarto render can't catch.
version: 0.1.0
---

# Verifying Visual Math Lab changes

Visual Math Lab is a static Quarto site (no backend, no bundler). `quarto render` only catches Pandoc/parse errors — it does **not** catch OJS runtime errors (a broken `VM.category.fn` call site, a bad cross-file reference, a mis-scoped rename) since those only throw in the browser. Verification here is two-tier: fast pure-function regression tests, then a real browser pass over every rendered page.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

Dev-only tooling (`package.json`, Playwright) — nothing here ships to `docs/` or affects the site's runtime. The shared `VM.*` library and its unit tests live in the mathviz repo (`../mathviz`, vendored here under `_extensions/`); its `npm test` is that library's Tier 1.

## Tier 1: `npm test` — structural and pure-logic regressions

`node --test` (Node's built-in test runner, zero extra dependencies) discovers every `*.test.js` file automatically. Here that is two files: `js/report-bug.test.js` (the one site-specific script left in `js/`, loaded the way a `<script>` tag would via indirect `eval`) and `scripts/analytics.test.js` (structural invariants on `analytics.html`/`consent.html`/`head-scripts.html`/`_quarto.yml`/`privacy.qmd`, plus the snippet's client-side logic against a stubbed DOM).

```bash
npm test
```

The `VM.*` unit tests (51 files, one per function) moved to the mathviz repo with the code. After editing a shared function there, run `npm test` **in that repo** — its `scripts/load-vm.mjs` loads the real `src/js/**` files in manifest order into the current realm, so a wiring bug (wrong category, typo'd name, broken cross-file reference) shows up as a real `TypeError`, not a false pass. Then `npm run build` there and `quarto add /path/to/mathviz --no-prompt` here to try the change on real pages before tagging a release.

## Tier 2: `npm run verify` — full browser pass over every page

```bash
npm run verify   # = node scripts/verify-pages.mjs
```

`scripts/verify-pages.mjs` spawns `quarto preview` itself (rather than a blocking `quarto render` followed by a plain static file server) and walks **every** page discovered from the source tree — every `index.qmd` under the project (no hardcoded page list — new pages are picked up automatically, per this repo's page-naming convention, see `CLAUDE.md`), four pages at a time as tabs of one Chromium (`--jobs N` to change that). For each page it:
1. loads it, waits for network idle, then for every OJS cell to finish evaluating (no `.observablehq--running` left outside a function-declaration cell, whose inspector never flips; capped at 1.5s),
2. clicks every visible `<button>` (Plot/Regenerate/etc. — many `VM.*` calls only run inside click handlers, not on initial render), leaving fullscreen after each click if the button entered it — otherwise the fullscreened block covers every later button, and none of their handlers would run,
3. nudges every `<input type=range>` to its midpoint,
4. asserts zero `console.error`, zero uncaught page errors, zero failed requests.

Prints `OK`/`FAIL` per page, in page order, with the time each page took; a `FAIL` includes the exact console error (which OJS cell, which line) — usually enough to find the bug directly, no further digging needed.

`npm run verify -- --changed` crawls only the pages whose folder differs from `develop` (`git diff --name-only develop` plus untracked files), which is the right scope for a session's work; it falls back to the full site, saying which file caused it, when the diff touches anything baked into every page (`_extensions/`, `_includes/`, `_theme/`, `styles.css`, `_quarto.yml`, `js/`, `fonts/`).

Using `quarto preview` instead of `quarto render` means only files that actually changed since the last run get re-rendered (`quarto preview`'s file watcher does this on its own, based on mtimes) — `quarto render` unconditionally re-renders the whole site every single invocation, which is wasted work in the common edit-then-verify loop. The first run in a session (or after `docs/` is deleted) still pays a full-site render up front, same as `quarto render` would — `quarto preview` needs the whole project's metadata to build navigation/search regardless of how many pages actually changed.

The same crawl (plus `npm test` and `npm run verify:analytics`) runs on GitHub Actions for every pull request to `develop` — `.github/workflows/pr-check.yml` — so a contributor only needs the single-page form locally.

## `npm run verify:analytics` — the analytics consent flow, in a real browser

```bash
npm run verify:analytics   # = node scripts/verify-analytics.mjs
```

A separate, narrower Tier 2 script for `_includes/analytics.html` (the GA4
snippet) and `_includes/consent.html` (the banner that gates it) — see
CLAUDE.md's "Analytics and consent" section for what these files do. It's
kept out of the main `npm run verify` crawl because it needs a fundamentally
different setup: `analytics.html` deliberately refuses to run on
`localhost`/`127.0.0.1` (so ordinary `quarto preview` sessions during
development don't pollute the real GA property), so this script serves the
already-rendered `docs/` directory itself and points Chromium's
`--host-resolver-rules` at a real-looking hostname instead — `verify-pages.mjs`'s
`quarto preview`-on-localhost approach can't exercise this path at all. Every
request to `google-analytics.com` is intercepted and aborted, so nothing this
script does ever reaches the live property.

It checks: the banner shows on a fresh visit and nothing is sent before a
choice is made; Allow sends exactly one correctly-shaped `page_view` and sets
no cookies; No thanks sends nothing and isn't asked again; the footer's
"Analytics preferences" link reopens the banner and withdrawing consent
actually stops measurement (not just promises to); and Do Not Track / Global
Privacy Control are honoured as an answer already given. Requires `docs/` to
already be rendered — run `quarto render` or `npm run verify` first if it
isn't.

The snippet's pure client-side logic (client-id generation, the
localhost/DNT/GPC guards, dropping the query string from the reported page
location) is covered separately by `scripts/analytics.test.js`, part of Tier
1 (`npm test`) — that file also has structural assertions on both files'
contents, e.g. that the `tid` is correct and the gate hasn't been "fixed"
away. A real browser is only needed for the gate itself: a `text/plain`
script fails to execute there, not in a stubbed sandbox.

## When to run which

- Editing a shared utility in mathviz (adding a math function, renaming, refactoring): `npm test` there first (fast), rebuild, re-`quarto add` it here, then `npm run verify` before considering it done — a function can pass its own unit tests and still be wired wrong at a call site on one of these pages.
- Editing a `.qmd` page only (new page, new OJS cells, no shared-utility changes): `npm run verify` is what actually exercises it; `npm test` won't see it.
- Editing `_includes/analytics.html` or `_includes/consent.html`: `npm test` first (fast, catches a dropped local patch or a re-broken gate expression), then `npm run verify:analytics` — the full `npm run verify` crawl doesn't exercise the consent flow at all, since it never accepts or declines the banner on any page.
- Adding a new shared utility function (in mathviz): add its `.test.js` alongside it (same pattern as the existing files) and list it in `src/manifest.mjs`, covering the properties that actually matter mathematically where possible (e.g. `sperner-color.test.js` doesn't just check "is a function" — it verifies the *end-to-end Sperner's-lemma property* that a colored triangulation always has an odd number of rainbow triangles, which is a far stronger regression guard than checking individual return values).

## Gotchas learned building this

- `node --test <directory>` (a bare path argument) fails oddly on some Node versions ("Cannot find module"). `node --test` with **no** path argument works reliably (auto-discovers `*.test.js` recursively from cwd) — that's what `npm test` uses.
- `assert.deepStrictEqual` on objects/arrays returned from code loaded via `vm.createContext` fails even when structurally identical, because that API creates a separate JS realm with its own `Object.prototype`. Both `js/report-bug.test.js` here and mathviz's `load-vm.mjs` avoid this by running scripts in the current realm via indirect `eval` instead.
- `verify-pages.mjs` spawns `quarto preview` with `detached: true` and kills it via `process.kill(-pid, 'SIGTERM')` (the whole process group), not a plain `proc.kill()` — the `quarto` CLI forks its own renderer/server subprocess, and killing only the immediate child leaves that subprocess (and the port) orphaned. It also passes `--timeout 120` to `quarto preview` itself as a belt-and-suspenders fallback in case the script's own cleanup is ever skipped (e.g. a hard crash).
- Do **not** pass `--no-watch-inputs` to `quarto preview` here — it disables the mtime-based re-render-on-change that keeps served pages current. Without the watcher, `verify-pages.mjs` would silently test whatever was last rendered instead of the current source, defeating the point of verification.
