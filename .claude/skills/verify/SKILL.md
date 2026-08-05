---
name: verify
description: This skill should be used to verify changes to Visual Math Lab (Quarto site, OJS cells, js/** shared utilities) actually work, before committing. Covers both pure-function regressions and browser-runtime errors that quarto render can't catch.
version: 0.1.0
---

# Verifying Visual Math Lab changes

Visual Math Lab is a static Quarto site (no backend, no bundler). `quarto render` only catches Pandoc/parse errors — it does **not** catch OJS runtime errors (a broken `VM.category.fn` call site, a bad cross-file reference, a mis-scoped rename) since those only throw in the browser. Verification here is two-tier: fast pure-function regression tests, then a real browser pass over every rendered page.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

Dev-only tooling (`package.json`, Playwright, mathjs for testing `js/expressions/*`) — nothing here ships to `docs/` or affects the site's runtime.

## Tier 1: `npm test` — pure `js/**` function regressions

`node --test` (Node's built-in test runner, zero extra dependencies) discovers every `js/**/*.test.js` file automatically. Each source file has a colocated test file (e.g. `js/discrete-math/pairColor.js` → `js/discrete-math/mixed-pair-color.test.js`).

Tests import `scripts/load-vm.mjs`'s `loadVM()`, which loads the **actual** `js/**/*.js` files (in the same order as `_includes/head-scripts.html`) into the current process's real global realm — not a re-implementation, and not a separate `vm.createContext` realm (a separate realm makes `assert.deepStrictEqual` fail on a cross-realm prototype check even when structurally identical — learned this the hard way, see the file's comment). This means a wiring bug (wrong category, typo'd function name, broken cross-file reference) shows up as a real `TypeError`, not a false pass.

```bash
npm test
```

Only pure, DOM-free functions get a `.test.js` — `js/ui/render-table.js` (needs Observable's `html` tagged template + real DOM) and `js/plotting/plotly-fullscreen-button.js` (a Plotly modebar-button config object, not really "testable" in isolation) are intentionally left to Tier 2 instead.

## Tier 2: `npm run verify` — full browser pass over every rendered page

```bash
npm run verify   # = quarto render && node scripts/verify-pages.mjs
```

`scripts/verify-pages.mjs` serves the rendered `docs/` directory, walks **every** `index.html` under it (no hardcoded page list — new pages are picked up automatically), and for each one:
1. loads it and waits for network idle,
2. clicks every visible `<button>` (Plot/Regenerate/etc. — many `VM.*` calls only run inside click handlers, not on initial render),
3. nudges every `<input type=range>` to its midpoint,
4. asserts zero `console.error`, zero uncaught page errors, zero failed requests.

Prints `OK`/`FAIL` per page; a `FAIL` includes the exact console error (which OJS cell, which line) — usually enough to find the bug directly, no further digging needed.

## When to run which

- Editing a `js/**` shared utility (adding a math function, renaming, refactoring): `npm test` first (fast), then `npm run verify` before considering it done — a function can pass its own unit tests and still be wired wrong at a call site.
- Editing a `.qmd` page only (new page, new OJS cells, no shared-utility changes): `npm run verify` is what actually exercises it; `npm test` won't see it.
- Adding a new shared utility function: add its `.test.js` alongside it (same pattern as the existing files), covering the properties that actually matter mathematically where possible (e.g. `sperner-color.test.js` doesn't just check "is a function" — it verifies the *end-to-end Sperner's-lemma property* that a colored triangulation always has an odd number of rainbow triangles, which is a far stronger regression guard than checking individual return values).

## Gotchas learned building this

- `node --test <directory>` (a bare path argument) fails oddly on some Node versions ("Cannot find module"). `node --test` with **no** path argument works reliably (auto-discovers `*.test.js` recursively from cwd) — that's what `npm test` uses.
- `assert.deepStrictEqual` on objects/arrays returned from code loaded via `vm.createContext` fails even when structurally identical, because that API creates a separate JS realm with its own `Object.prototype`. `load-vm.mjs` avoids this by running scripts in the current realm via indirect `eval` instead.
- `js/plotting/plotly-fullscreen-button.js` runs code (patches `Plotly.newPlot`/`react`, registers a `document` listener) at load time, not inside a callable — `load-vm.mjs` stubs `document`/`Plotly` before loading scripts so this doesn't throw outside a browser.
