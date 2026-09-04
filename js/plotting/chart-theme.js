/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Shared chart theme: one source of truth for the colors, Plotly layout,
// Plotly config, and Observable Plot options every method page's plots use,
// instead of each page hardcoding its own hex literals and copy-pasting
// `{responsive: true, displaylogo: false}` (15 pages did, verbatim).
//
// Every function reads the page's live --vm-* custom properties (see
// _theme/vml-light.scss / vml-dark.scss) via getComputedStyle at CALL time,
// not at load time, so a chart built after a dark-mode toggle picks up the
// new theme automatically. plotly-fullscreen-button.js's Plotly.newPlot/
// react patch also re-applies VM.plotting.layout() on every call (which
// happens on essentially every reactive rerender -- a step slider, an
// example load, ...) and relayouts every live chart the instant the theme
// toggles, so a chart re-themes without the page's own cell needing to know
// about dark mode at all.
(function attachVM(globalThis) {
  const cssVar = (name, fallback) => {
    if (typeof document === "undefined" || !document.documentElement) return fallback
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return value || fallback
  }

  const isDark = () => {
    if (typeof document === "undefined" || !document.body) return false
    return document.body.classList.contains("quarto-dark")
  }

  // Named after what each color means on the chart (the function itself,
  // an alternate/reference trace, a "good"/converged marker, ...), not the
  // hex value -- so a page reads `colors.fn` / `colors.alt` rather than
  // repeating a literal `"#2563eb"`. Each pair is the same hue site-wide
  // already used (light column matches the hardcoded hex it replaces:
  // fn ×50, alt ×61, ok ×40, muted ×29, ink ×19, warn ×14, accent2 ×13
  // occurrences respectively); the dark column lightens each one, since the
  // light-mode hex values read muddy on the dark theme's near-black ground.
  const PALETTE = {
    fn:      { light: "#2563eb", dark: "#8ab4ff" },
    alt:     { light: "#dc2626", dark: "#f87171" },
    ok:      { light: "#16a34a", dark: "#4ade80" },
    muted:   { light: "#94a3b8", dark: "#7d8aa3" },
    ink:     { light: "#111827", dark: "#c9cedb" },
    warn:    { light: "#f59e0b", dark: "#fbbf24" },
    accent2: { light: "#9333ea", dark: "#c084fc" }
  }

  // Returns a fresh snapshot of the palette for whichever theme is active
  // right now -- called (not just referenced) so a page that rebuilds its
  // trace colors on every reactive rerun stays in sync with the theme.
  const colors = () => {
    const dark = isDark()
    const out = {}
    for (const [name, pair] of Object.entries(PALETTE)) out[name] = dark ? pair.dark : pair.light
    return out
  }

  // A plain recursive merge, not Object.assign -- overrides.xaxis should
  // extend the default xaxis (add a `range`, say) rather than replace it
  // wholesale and drop the shared gridcolor/zerolinecolor/ticks.
  const deepMerge = (base, override) => {
    if (override === undefined) return base
    if (override === null || typeof override !== "object" || Array.isArray(override)) return override
    if (base === null || typeof base !== "object" || Array.isArray(base)) return override
    const out = { ...base }
    for (const key of Object.keys(override)) out[key] = deepMerge(base[key], override[key])
    return out
  }

  // The shared Plotly layout. paper_bgcolor/plot_bgcolor are transparent
  // rather than a theme color so the chart shows the page's own background
  // through it -- this is what removes both Plotly's default #E5ECF6 plot
  // area and the "white box on a dark page" bug in one move, with no
  // separate light/dark case to keep in sync.
  const layout = (overrides) => {
    const text = cssVar("--vm-text", "#14161a")
    const textSoft = cssVar("--vm-text-soft", "#5f6672")
    const grid = cssVar("--vm-grid", "rgba(20, 22, 26, 0.08)")
    const border = cssVar("--vm-border", "rgba(27, 31, 36, 0.15)")
    const surface = cssVar("--vm-surface", "#f6f7f9")
    const axisDefaults = {
      gridcolor: grid,
      zerolinecolor: border,
      linecolor: border,
      tickcolor: border,
      ticks: "outside",
      ticklen: 4,
      automargin: true,
      color: textSoft
    }
    const base = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter, system-ui, -apple-system, sans-serif", size: 13, color: text },
      xaxis: { ...axisDefaults },
      yaxis: { ...axisDefaults },
      colorway: Object.values(colors()),
      hoverlabel: { bgcolor: surface, bordercolor: border, font: { color: text } },
      margin: { l: 0, r: 0, t: 0, b: 0 }
    }
    return deepMerge(base, overrides)
  }

  // A FLAT, dotted-path patch of just the theme-dependent style attributes,
  // for Plotly.relayout -- unlike layout() above (used to build a chart's
  // full layout via Plotly.newPlot/react, which treats the object it's
  // given as the complete desired layout), relayout's `update` argument
  // replaces whichever attribute each key names wholesale. A nested
  // `{xaxis: {...}}` key would therefore wipe out the page's own
  // xaxis.title/range instead of patching alongside them; dotted keys like
  // "xaxis.gridcolor" patch only that one sub-property. Used to re-theme
  // every on-page chart the instant dark mode toggles, without touching
  // anything the page itself set.
  const themePatch = () => {
    const text = cssVar("--vm-text", "#14161a")
    const textSoft = cssVar("--vm-text-soft", "#5f6672")
    const grid = cssVar("--vm-grid", "rgba(20, 22, 26, 0.08)")
    const border = cssVar("--vm-border", "rgba(27, 31, 36, 0.15)")
    const surface = cssVar("--vm-surface", "#f6f7f9")
    const patch = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      "font.color": text,
      "hoverlabel.bgcolor": surface,
      "hoverlabel.bordercolor": border,
      "hoverlabel.font.color": text
    }
    for (const axis of ["xaxis", "yaxis"]) {
      patch[`${axis}.gridcolor`] = grid
      patch[`${axis}.zerolinecolor`] = border
      patch[`${axis}.linecolor`] = border
      patch[`${axis}.tickcolor`] = border
      patch[`${axis}.color`] = textSoft
    }
    return patch
  }

  // Replaces the `{responsive: true, displaylogo: false}` object every page
  // copy-pasted (15 pages, verbatim) with one shared default.
  const config = (overrides) => deepMerge({ responsive: true, displaylogo: false }, overrides)

  // The Observable Plot equivalent of layout() -- same font, same grid
  // color, same palette -- so the iterates/convergence Plot charts under a
  // page's main Plotly chart read as the same chart system, not a visually
  // different library bolted on underneath.
  const plotOptions = (overrides) => {
    const text = cssVar("--vm-text", "#14161a")
    const grid = cssVar("--vm-grid", "rgba(20, 22, 26, 0.08)")
    const border = cssVar("--vm-border", "rgba(27, 31, 36, 0.15)")
    const base = {
      style: { fontFamily: "Inter, system-ui, -apple-system, sans-serif", fontSize: 12, color: text },
      color: { range: Object.values(colors()) },
      grid: true
    }
    const merged = deepMerge(base, overrides)
    // Plot's x/y scale options don't nest under a shared parent the way
    // Plotly's axes do, so thread the grid/axis color through both if the
    // caller hasn't already set one, rather than folding them into `base`
    // (which would clobber a caller's own `x`/`y` domain/label options via
    // deepMerge's object-replace-when-non-object semantics).
    for (const axis of ["x", "y"]) {
      if (merged[axis] && merged[axis].stroke === undefined) merged[axis] = { ...merged[axis], stroke: border }
    }
    if (merged.grid === true) merged.grid = true
    return merged
  }

  globalThis.VM = {
    ...globalThis.VM,
    plotting: { ...globalThis.VM?.plotting, colors, layout, config, plotOptions, themePatch }
  }
})(window)
