<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Visual Math Lab

[www.visualmathlab.com](https://www.visualmathlab.com) — interactive,
browser-based visualizations of numerical methods, probability, and a little
discrete math. A [Quarto](https://quarto.org) website; every app is a single
`.qmd` page whose logic lives in Observable JS cells, drawn with Plotly and
Observable Plot.

## Run it locally

```sh
git clone https://github.com/apurvanakade/VisualMathLab && cd VisualMathLab
quarto preview           # renders each page on demand at http://localhost:4200
```

That is all a content change needs. `npm install` (once) adds the dev-only
tooling: `npm test` for the site's structural tests and `npm run verify` for a
headless-browser pass over every rendered page.

## Add an app

1. `cp -r apps/_template apps/<slug>` and work through the `TODO`s — the
   template is a working fixed-point-iteration page with every cell the site
   expects (`result`, `setup`, `mainPlot`, the URL-synced inputs, the example
   dropdown, the step slider, the convergence plots, the table), so it renders
   before you change a line.
2. Add `apps/<slug>/index.qmd` to its topic's `listing.contents` in
   `topics/<topic>/index.qmd` and to the sidebar in `_quarto.yml`.
3. `quarto preview`, open the page, and iterate.

`CLAUDE.md` is the long-form guide to the page conventions;
`CONTRIBUTING.md` covers licensing and file headers.

## Embed an app elsewhere

Any app can be framed into another site with `?embed=1` on its URL — see
[Embedding an app](https://www.visualmathlab.com/embed.html).

## Where the shared code lives

The chart theming, control-panel styling, slider playback, floating legend
and numerical helpers every page uses are a separate library,
[mathviz](https://github.com/apurvanakade/mathviz), packaged as a Quarto
extension and vendored here under `_extensions/`. This repository is the
content: the app pages, the topic listings, the theme and the site chrome.
To change something every page shares, change it there.

## References

- https://stackoverflow.com/questions/69033403/how-to-refresh-sliderinput-in-shiny-in-real-time-not-only-when-the-sliding-en
- https://vanderbei.princeton.edu/JAVA/pivot/simple.html
- https://visualpde.com/explore.html
