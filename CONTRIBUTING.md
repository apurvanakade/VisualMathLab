# Contributing to Visual Math Lab

Thank you for your interest in contributing to `Visual Math Lab`! We welcome contributions from everyone, whether you are developing interactive JavaScript visualizations, structuring HTML pages, creating Quarto documents, or writing Python notebooks.

## Quick start

```sh
git clone https://github.com/apurvanakade/VisualMathLab && cd VisualMathLab
quarto preview        # http://localhost:4200
```

The first `quarto preview` renders the whole site once -- about a minute, the same one-time cost as an `npm install`, not a hang. After that it re-renders only the page you open or the file you save, so a new app page is the only thing that renders while you work on it.

**A new app** starts as a copy of the starter page: `cp -r apps/_template apps/<slug>`, then work through its `TODO`s. It is a complete, working page (a fixed-point iteration) with every cell the site's pages share, so it renders before you change anything. Keep its `<div class="vm-app">` wrapper around the controls panel and the chart: that is the part another site gets when it embeds the page with `?embed=1` (the callouts and prose below the chart stay outside it). Then list the page in its topic's `listing.contents` (`topics/<topic>/index.qmd`) and in `_quarto.yml`'s sidebar -- neither is discovered automatically. Give it a `topic:` that matches the topic page's `title:` exactly, an `order:` one higher than the topic's current last app, a one-sentence plain-text `description:`, and an `image:` (`npm run thumbs` takes the screenshots).

**Checking your work**: open the page in `quarto preview` and use it -- `quarto render` only catches parse errors, not a cell that throws at runtime. For a scripted check of just your page, `npm install` once and run `npm run verify -- apps/<slug>/index.qmd`, which drives that one page in a headless browser and fails on any console error. You do not need to run the full-site crawl (`npm run verify` with no arguments, several minutes) yourself: every pull request to `develop` runs it on GitHub Actions (`.github/workflows/pr-check.yml`), and the check has to be green before the page is merged.

**The shared code** -- `VM.*` helpers, the `ojs-*` panel and chart classes, the `--vm-*` design tokens -- is the [mathviz](https://github.com/apurvanakade/mathviz) library, vendored under `_extensions/`. A change every page should get belongs there, not here (and `_extensions/` itself is never edited by hand: it is what `quarto add apurvanakade/mathviz` copied in).

`CLAUDE.md` documents the page conventions in depth (URL-synced inputs, the example dropdown, the chart block and its slider bar, the legend); read the section for whatever you are touching.

## Licensing Policy

By contributing to this repository, you agree that your contributions will be licensed under the project's [Apache License 2.0](LICENSE). 

Because copyright in this project is distributed, you retain ownership of your code, but you grant the community a perpetual, royalty-free license to use, modify, and distribute it under the Apache 2.0 terms.

---

## File Header Templates

To maintain consistency and ensure everyone receives proper academic and legal credit, **every new code or content file added to this repository must include a copyright header at the very top.** 

Please copy, paste, and update the template matching your file's language:

### 1. Quarto Documents (`.qmd`) and Markdown Files (`.md`)
For Markdown and Quarto files, wrap the header in standard HTML comment tags at the very beginning of the document:
```markdown
<!--
Copyright (c) [Year] [Your Name]. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: [Your Name]
-->

```

### 2. Jupyter Notebooks (`.ipynb`)

For Jupyter Notebooks, create a **Markdown cell** at the very top of your notebook and paste the following:

```markdown
> **Copyright (c) [Year] [Your Name]. All rights reserved.**  
> *Released under Apache 2.0 license as described in the file LICENSE.*  
> **Authors:** [Your Name]

```

### 3. JavaScript / TypeScript / CSS Files (`.js`, `.ts`, `.css`)

```javascript
/**
 * Copyright (c) [Year] [Your Name]. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: [Your Name]
 */

```

### 4. Python / R / Configuration Files (`.py`, `.R`, `.yml`)

```python
# Copyright (c) [Year] [Your Name]. All rights reserved.
# Released under Apache 2.0 license as described in the file LICENSE.
# Authors: [Your Name]

```

### 5. HTML Files (`.html`)

```html
<!--
Copyright (c) [Year] [Your Name]. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: [Your Name]
-->

```

---

## Managing Headers on Existing Files

* **Minor edits:** If you are fixing a bug, adjusting layout spacing, or correcting a typo in an existing file, you do not need to alter the header.
* **Significant additions:** If you contribute a substantial new feature, script, or section to an existing file, please add your name to the `Authors` line of that file:
```text
Authors: Apurva Nakade, [Your Name]

```


