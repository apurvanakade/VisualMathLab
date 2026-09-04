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
  // Reads from document.body, NOT document.documentElement. The light
  // tokens are declared on `:root` (_theme/vml-light.scss) but the dark ones
  // are declared on `body.quarto-dark` (_theme/vml-dark.scss) -- which is
  // what Quarto's own theme toggle flips. Reading from <html> therefore
  // returns the *light* value even in dark mode, since the dark block never
  // matches <html>. Measured on a real page after toggling to dark:
  //   getComputedStyle(documentElement)["--vm-surface"] -> "#f6f7f9" (light)
  //   getComputedStyle(document.body)["--vm-surface"]   -> "#1e2436" (right)
  // That single wrong element is what made every chart's hover label render
  // as a white box on the dark theme.
  const cssVar = (name, fallback) => {
    if (typeof document === "undefined") return fallback
    const element = document.body || document.documentElement
    if (!element) return fallback
    const value = getComputedStyle(element).getPropertyValue(name).trim()
    return value || fallback
  }

  const isDark = () => {
    if (typeof document === "undefined" || !document.body) return false
    return document.body.classList.contains("quarto-dark")
  }

  // "dark" | "light". Exported so a page can build a reactive OJS cell that
  // re-runs on a theme toggle -- see the vmTheme pattern in
  // root-finding/newton-method/index.qmd.
  const themeName = () => (isDark() ? "dark" : "light")

  // Matches $font-family-sans-serif in _theme/vml-{light,dark}.scss, so
  // chart text is typeset in the same face as the page around it.
  const FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif"

  // Calls back with "light"/"dark" now, and again on every theme toggle.
  // Returns a teardown function, so it drops straight into an OJS cell:
  //
  //   vmTheme = Generators.observe(notify => VM.plotting.onThemeChange(notify))
  //   chartColors = VM.plotting.colors(vmTheme)
  //
  // which is what makes a page's trace colors repaint on a toggle -- the
  // chart chrome re-themes itself via relayout, but trace colors are values
  // the page baked into its traces, so only re-running the cell repaints
  // them.
  //
  // The notify is deferred two frames on purpose. Quarto's toggle flips the
  // body class and swaps the light/dark stylesheet as separate steps, class
  // first -- so a callback that runs inline sees the new class but the OLD
  // stylesheet, and every --vm-* read during the rebuild returns the
  // outgoing theme's value. Measured: the rebuilt traces came back with the
  // correct new palette (that comes from the class) but a stale light
  // hover-label background (that comes from getComputedStyle).
  const onThemeChange = (callback) => {
    callback(themeName())
    if (typeof document === "undefined" || !document.body) return () => {}
    if (typeof MutationObserver === "undefined") return () => {}
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => callback(themeName())))
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }

  const prefersReducedMotion = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
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
    accent2: { light: "#9333ea", dark: "#c084fc" },
    // The ring drawn around a marker to lift it off whatever it sits on --
    // pages hardcoded `line: {color: "white"}` for this, which is a white
    // halo on a near-black chart in dark mode.
    halo:    { light: "#ffffff", dark: "#171b29" }
  }

  // Same hue as a palette token, at the given opacity -- for the translucent
  // area/bar fills that pair with a solid stroke of the same color. Pages
  // used to hardcode these as `rgba(22, 163, 74, 0.2)` literals, which stay
  // light-mode green after a theme toggle while their own stroke lightens,
  // so fill and stroke visibly drift apart in dark mode.
  const hexToRgb = (hex) => {
    const clean = hex.replace("#", "")
    const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    }
  }

  const alpha = (token, opacity) => {
    const pair = PALETTE[token]
    const hex = pair ? (isDark() ? pair.dark : pair.light) : token
    if (typeof hex !== "string" || !hex.startsWith("#")) return hex
    const { r, g, b } = hexToRgb(hex)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
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

  // Plotly's/Plot's automatic color cycle for traces a page didn't color
  // explicitly. `halo` is excluded deliberately -- it's the marker-ring
  // color (white on light, the page background on dark), so cycling a trace
  // onto it would draw that trace in the background color, invisible.
  const colorway = () => {
    const active = colors()
    const out = []
    for (const name of Object.keys(PALETTE)) {
      if (name === "halo") continue
      out.push(active[name])
    }
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
    const accent = cssVar("--vm-accent", "#2563eb")
    const axisDefaults = {
      gridcolor: grid,
      zerolinecolor: border,
      linecolor: border,
      tickcolor: border,
      ticks: "outside",
      ticklen: 4,
      automargin: true,
      color: textSoft,
      tickfont: { size: 12, color: textSoft },
      title: { font: { size: 13, color: textSoft } }
    }
    const base = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: FONT_FAMILY, size: 13, color: text },
      xaxis: { ...axisDefaults },
      yaxis: { ...axisDefaults },
      colorway: colorway(),
      hoverlabel: hoverLabel(),
      // Trace `text` labels (the x₀/x₁ callouts next to iteration markers)
      // inherit no color of their own, so without this they render in
      // Plotly's default near-black and disappear on the dark theme.
      textfont: { family: FONT_FAMILY, color: text },
      // Plotly's own modebar chrome. The shape (pill, blur, radius) is CSS
      // in styles.css; these are the parts only Plotly can set.
      modebar: {
        bgcolor: "rgba(0,0,0,0)",
        color: textSoft,
        activecolor: accent
      },
      // Tween between steps instead of snapping, so an iteration slider
      // reads as the method advancing rather than as a flicker. Honors the
      // OS reduced-motion setting.
      transition: { duration: prefersReducedMotion() ? 0 : 300, easing: "cubic-in-out" },
      // Small but non-zero: automargin adds whatever the tick labels and
      // axis titles actually need on top of this, but with a flat 0 the
      // rotated y-title ends up flush against the container's edge.
      margin: { l: 8, r: 12, t: 12, b: 8 }
    }
    return deepMerge(base, overrides)
  }

  // Keeps a chart sized to its box, and stops doing so once that box leaves
  // the page. Every mainPlot cell creates its graph div detached, so Plotly
  // measures 0x0 at newPlot time and needs a resize once the div is in the
  // DOM -- but the observer outlives the div: when a page's mainPlot cell
  // re-runs (which now happens on a dark-mode toggle, since chartColors is
  // reactive), it builds a *new* div and the old one is detached with its
  // observer still firing, which makes Plotly throw
  // "Resize must be passed a displayed plot div element."
  const autoResize = (div) => {
    if (typeof ResizeObserver === "undefined") return null
    const observer = new ResizeObserver(() => {
      if (!div.isConnected) {
        observer.disconnect()
        return
      }
      // A detached-but-connected div can still be display:none (a collapsed
      // callout, an inactive tab), which Plotly also refuses to resize.
      if (div.offsetParent === null && div.getClientRects().length === 0) return
      globalThis.Plotly?.Plots?.resize(div)
    })
    observer.observe(div)
    return observer
  }

  // "x" + subscript digits, for the iteration labels drawn next to markers
  // (x₀, x₁, ... x₁₀). Plotly's trace `text` is plain text with no markup,
  // so a label written as "x_0" renders with a literal underscore -- which
  // on a mathematics site reads as a typo. Unicode subscripts are the only
  // way to get real subscripts into a Plotly data label.
  const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉"

  const subscript = (value) => {
    const digits = String(value)
    let out = ""
    for (const digit of digits) {
      const index = "0123456789".indexOf(digit)
      if (index === -1) out += digit
      else out += SUBSCRIPT_DIGITS[index]
    }
    return out
  }

  // The themed hover-tooltip style. Exported separately from layout()
  // because it has to be applied per trace as well: Plotly defaults a
  // trace's hover-label background to that trace's own color, which beats
  // layout.hoverlabel, so setting it only on the layout leaves every
  // tooltip unthemed. plotly-fullscreen-button.js injects this onto each
  // trace that doesn't set its own.
  const hoverLabel = () => ({
    bgcolor: cssVar("--vm-surface", "#f6f7f9"),
    bordercolor: cssVar("--vm-border", "rgba(27, 31, 36, 0.15)"),
    align: "left",
    font: { family: FONT_FAMILY, size: 12, color: cssVar("--vm-text", "#14161a") }
  })

  // A centered message drawn in the empty plot area, for when a page's
  // `result` cell bailed out (an unparseable expression, a non-finite
  // guess). Without it an invalid formula silently renders an empty grid
  // that looks identical to a valid-but-empty result.
  const emptyState = (message) => {
    const textSoft = cssVar("--vm-text-soft", "#5f6672")
    return [{
      text: message,
      xref: "paper",
      yref: "paper",
      x: 0.5,
      y: 0.5,
      showarrow: false,
      font: { family: FONT_FAMILY, size: 14, color: textSoft },
      align: "center"
    }]
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
    const accent = cssVar("--vm-accent", "#2563eb")
    const patch = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      "font.color": text,
      "textfont.color": text,
      "hoverlabel.bgcolor": surface,
      "hoverlabel.bordercolor": border,
      "hoverlabel.font.color": text,
      "modebar.color": textSoft,
      "modebar.activecolor": accent,
      // Repainted on a toggle so a trace the page left uncolored picks up
      // the new theme's palette rather than staying on the old one.
      colorway: colorway()
    }
    for (const axis of ["xaxis", "yaxis"]) {
      patch[`${axis}.gridcolor`] = grid
      patch[`${axis}.zerolinecolor`] = border
      patch[`${axis}.linecolor`] = border
      patch[`${axis}.tickcolor`] = border
      patch[`${axis}.color`] = textSoft
      patch[`${axis}.tickfont.color`] = textSoft
      patch[`${axis}.title.font.color`] = textSoft
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
      style: { fontFamily: FONT_FAMILY, fontSize: 12, color: text },
      color: { range: colorway() },
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
    plotting: {
      ...globalThis.VM?.plotting,
      colors, colorway, alpha, themeName, onThemeChange, subscript, autoResize,
      layout, config, plotOptions, themePatch, emptyState, hoverLabel
    }
  }
})(window)
