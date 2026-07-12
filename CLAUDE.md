# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

VisualMath is a Quarto website of interactive, browser-based visualizations of numerical methods. There is no backend and no build tooling beyond Quarto — all interactivity runs client-side via Observable JS (OJS) cells plus vanilla JS modules, math.js, and Plotly loaded from CDNs.

## Commands

- `quarto render` — render the whole site into `docs/` (`_quarto.yml` sets `project.output-dir: docs`).
- `quarto render root-finding/newton-method/index.qmd` — render a single page while iterating.
- `quarto preview` — local live-reload preview server.

There are no test or lint commands; there is no package manager (no `package.json`). JS is served as static files, not bundled.

## Source vs. generated output

- Edit `.qmd`, `.css`, and `js/**` files. **`docs/` is generated** — never edit it by hand; re-render instead. (`.gitignore` ignores `docs/`, though a prior build is still tracked.)
- Deployment (`.github/workflows/deploy.yml`) publishes the `gh-pages` branch to GitHub Pages. It does **not** run `quarto render` — rendered output must reach `gh-pages` separately.

## Architecture

Each method page (`root-finding/<method>/index.qmd`) is a self-contained interactive app. There is no `method.js` per page — all method logic and rendering live directly in named OJS cells inside the `.qmd`:

1. A raw-HTML block loads CDN scripts (math.js, Plotly) and the shared `js/*.js` utilities, exposing `window.VM` (see below).
2. `result` — runs the numerical method with the current inputs (e.g. Newton, bisection, fixed-point) and returns `{rows, f, ...}`. `rows` is the full iteration history; each page's `result` cell already reads like plain imperative code (`while` loop, explicit early returns) rather than a functional pipeline.
3. `setup` — derives the data shared by the plots below from `result`: which rows are visible at the current step, axis ranges, and a sampled curve for the smooth function trace.
4. `mainPlot` — builds the primary Plotly chart. It's a closure over a `_plotDiv` variable so the same DOM node is reused across reactive re-renders (`Plotly.react` instead of `Plotly.newPlot` after the first render) — this is what preserves user zoom/pan when the step slider moves.
5. `iteratesPlot`, `convergencePlot` — Observable Plot charts covering the entire run (not just the current step), shown in a collapsed "Convergence plots" callout.
6. `iterationTable` — builds a DOM table via `VM.renderTable`, shown in a collapsed "Iteration table" callout.

OJS cells wire Quarto `Inputs.*` controls (function text, initial guess/endpoints, max iterations) → `result` → an `Inputs.range` step slider → `setup` → `mainPlot(setup)`. OJS reactivity re-runs everything downstream when any input changes.

### Shared utilities (`js/`)

Each file is a small IIFE that extends `window.VM` with one function:

- `js/make-function.js` → `VM.makeFunction(mathjs, expr)` — returns `(x) => number`, or `null` if the expression can't be parsed. Normalizes input (trim, replace `π` → `pi`), compiles via math.js, evaluates safely.
- `js/make-derivative.js` → `VM.makeDerivative(mathjs, expr)` — like `makeFunction` but returns the symbolic derivative.
- `js/padded-range.js` → `VM.paddedRange(values, opts)` — returns `{lo, hi}` with configurable padding for axis ranges.
- `js/render-table.js` → `VM.renderTable({html, headers, rows})` — returns a DOM table node styled with `ojs-table` classes.

### Adding a new method page

1. Create `root-finding/<method>/index.qmd` — copy an existing page (e.g. `root-finding/newton-method/index.qmd`) and adapt its `result`, `setup`, `mainPlot`, `iteratesPlot`, `convergencePlot`, and `iterationTable` cells to the new method's math and input fields. The script block needs only mathjs, Plotly, and the `../../js/*.js` utilities.
2. Give the front matter an `order: <n>` field one higher than the current last method, so the sidebar (which auto-discovers pages and sorts on this field, since every page is named `index.qmd`) places it correctly. No other file needs editing — `root-finding/index.qmd`, the homepage `index.qmd`, and `_quarto.yml`'s sidebar all discover pages via glob (`root-finding/*/index.qmd`).

User-entered expressions are evaluated in-browser. Use `VM.makeFunction`/`VM.makeDerivative` (they handle normalization and error catching, returning `null` on a bad expression) rather than calling math.js directly. Currently, invalid input just makes `result` return empty `rows` (blank chart, empty table) — there's no surfaced error message to the user yet.

## Conventions

- Every new code/content file must begin with the copyright/license header for its file type — see `CONTRIBUTING.md`. Authorship is per-file and per-contributor; add your name to `Authors:` for significant additions.
- Interactive pages use `page-layout: full` and reuse the design-system CSS classes in `styles.css` (`ojs-panel`, `ojs-row`, `ojs-grid`, `ojs-fill`, `ojs-auto`, `ojs-table-container`, `ojs-table-toolbar`, `plotly-box-large`) rather than ad hoc per-page styling. `ojs-panel` is chrome only; `ojs-row`/`ojs-grid` are layout only — combine them (`class="ojs-panel ojs-row"`) for a standalone panel, or nest a bare `ojs-row`/`ojs-grid` inside an `ojs-panel` for a control group within a larger panel. Attach `ojs-fill`/`ojs-auto` via `classList.add` on an `Inputs.*` wrapper div to make it fill its row or keep its natural width, instead of setting `el.style` directly.
- Keep each page's logic in small named OJS cells (`result`, `setup`, `mainPlot`, `iteratesPlot`, `convergencePlot`, `iterationTable`) rather than one large cell, and keep the same cell names/shapes across method pages for consistency.
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and ternaries in OJS cells and `js/*.js` — this codebase is read by a Python-oriented audience, and imperative control flow reads more naturally to them than JS-functional chains. Callbacks required by an API (Plotly config values, `Plot` accessors, `addEventListener`) are fine to keep; clean up their bodies per the same rule if they contain a chain/ternary. Stateful closures that exist for a real reason (e.g. `mainPlot`'s `_plotDiv` reuse) are not a style violation and shouldn't be "fixed."
