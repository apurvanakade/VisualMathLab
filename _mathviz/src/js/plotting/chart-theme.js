/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Shared chart theme: one source of truth for the colors, Plotly layout,
// Plotly config, and Observable Plot options every chart on a page uses,
// instead of each page hardcoding its own hex literals and copy-pasting
// `{responsive: true, displaylogo: false}`.
//
// Every function reads the page's live --vm-* custom properties (declared
// with defaults in src/css/tokens.css; a site overrides them in its own
// stylesheet) via getComputedStyle at CALL time, not at load time, so a
// chart built after a dark-mode toggle picks up the new theme automatically.
// plotly-fullscreen-button.js's Plotly.newPlot/react patch also re-applies
// VM.plotting.layout() on every call (which happens on essentially every
// reactive rerender -- a step slider, an example load, ...) and relayouts
// every live chart the instant the theme toggles, so a chart re-themes
// without the page's own cell needing to know about dark mode at all.
(function attachVM(globalThis) {
  // Which theme is active, as a CSS selector matched against <body> and
  // <html>. MUST stay identical to the dark block's selector list in
  // src/css/tokens.css -- that stylesheet is where the dark token values
  // live, and this is how the JS agrees with it about when they apply.
  // `body.quarto-dark` is what Quarto's light/dark toggle sets;
  // `html[data-bs-theme="dark"]`/`body[data-bs-theme="dark"]` is Bootstrap
  // 5.3's convention; `html.vm-dark`/`body.vm-dark` is for a site with its
  // own toggle. Deliberately root-scoped (html/body only, not a bare
  // `[data-bs-theme="dark"]`) -- Quarto sets that same attribute directly
  // on its <nav> element to force a dark navbar variant independent of the
  // page theme, and since custom properties inherit down the DOM, an
  // unscoped match there leaked the whole dark palette into the navbar (and
  // anything nested in it) on an otherwise-light page. A site whose toggle
  // uses none of these calls VM.plotting.configure({darkSelector: ".my-dark"})
  // once at load (and declares its dark --vm-* tokens under that same
  // selector, scoped the same way).
  const settings = {
    darkSelector: 'body.quarto-dark, html[data-bs-theme="dark"], body[data-bs-theme="dark"], html.vm-dark, body.vm-dark'
  }

  /**
   * Adjusts the module's settings. The only setting today is
   * `darkSelector`, for a site whose theme toggle uses none of the default
   * hooks; declare the dark `--vm-*` tokens under that same selector.
   *
   * @param {{darkSelector?: string}} [overrides] - Merged into the settings
   *   when it is an object; anything else is ignored. Keys are not
   *   validated -- an unknown key is stored and never read.
   * @returns {{darkSelector: string}} A copy of the settings now in effect.
   */
  const configure = (overrides) => {
    if (overrides && typeof overrides === "object") Object.assign(settings, overrides)
    return { ...settings }
  }

  // Reads from document.body, NOT document.documentElement. The dark tokens
  // are declared under a selector that matches <body> (Quarto's toggle
  // flips a class there), and <html> never matches it -- so reading from
  // <html> returns the *light* value even in dark mode. Measured on a real
  // page after toggling to dark:
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
    if (typeof document === "undefined") return false
    for (const element of [document.body, document.documentElement]) {
      if (!element || typeof element.matches !== "function") continue
      if (element.matches(settings.darkSelector)) return true
    }
    return false
  }

  /**
   * Which theme is active right now, by testing the dark selector against
   * `<body>` and then `<html>`.
   *
   * @returns {"light"|"dark"} `"light"` when there is no `document` (Node).
   */
  const themeName = () => (isDark() ? "dark" : "light")

  // The face chart text is set in, read from the --vm-font-sans token so a
  // site that loads its own font (Inter, say) gets charts typeset in the
  // same face as the page around them. The fallback is the system stack.
  const fontFamily = () => cssVar(
    "--vm-font-sans",
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  )

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
  //
  // The `last` check is what keeps this from firing on class changes that
  // have nothing to do with the theme. <body>'s class list is shared: a
  // site's own scripts write to it (Visual Math Lab's sidebar rail toggles
  // .vm-sidebar-open on it whenever the sidebar opens or closes), and
  // without this guard each of those notified every consumer -- which, on a
  // page whose chartColors cell depends on this, re-ran mainPlot, the legend
  // and both sub-charts, rebuilding the whole chart for nothing. The
  // comparison has to live INSIDE the deferred callback, not around the
  // requestAnimationFrame pair, so the two-frame wait above still happens
  // on a real toggle.
  //
  // Both <html> and <body> are observed, since the dark selector can match
  // either (Quarto flips a body class, Bootstrap sets data-bs-theme on html).
  /**
   * Calls `callback` with the theme name now, synchronously, and again
   * after every real theme change. Fits `Generators.observe` directly:
   * `vmTheme = Generators.observe(notify => VM.plotting.onThemeChange(notify))`.
   *
   * @param {(theme: "light"|"dark") => void} callback
   * @returns {() => void} A teardown that disconnects the observer. A no-op
   *   when there is no `document.body` or no `MutationObserver` (the
   *   initial call still happens).
   */
  const onThemeChange = (callback) => {
    let last = themeName()
    callback(last)
    if (typeof document === "undefined" || !document.body) return () => {}
    if (typeof MutationObserver === "undefined") return () => {}
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const next = themeName()
        if (next === last) return
        last = next
        callback(next)
      }))
    })
    const options = { attributes: true, attributeFilter: ["class", "data-bs-theme"] }
    observer.observe(document.body, options)
    if (document.documentElement) observer.observe(document.documentElement, options)
    return () => observer.disconnect()
  }

  const prefersReducedMotion = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  // ui/slider-play.js publishes how long it has, in ms, between one slider
  // value and the next while a sweep is running (0 when idle). The default
  // 300ms transition below assumes a human dragging the slider, one step at a
  // time -- during an animated sweep that is often longer than the gap
  // between values, so every tween gets cut off by the next one and the chart
  // reads as lagging rather than animating. Reading it fresh here, rather
  // than slider-play.js reaching into Plotly directly, keeps the two files
  // independent: this one doesn't need to know playback exists at all when
  // nothing is playing.
  const playbackTweenMs = () => {
    const value = globalThis.VM?.ui?.playbackTweenMs
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
    return value
  }

  // The chart palette lives in CSS: --vm-color-<name> in src/css/tokens.css
  // (light on :root, dark under the dark selector), so a site re-themes its
  // charts by overriding custom properties, the same way it re-themes the
  // panels. Named after what each color means on the chart (the function
  // itself, an alternate/reference trace, a "good"/converged marker, ...),
  // not the hex value -- so a page reads `colors.fn` / `colors.alt` rather
  // than repeating a literal "#2563eb".
  //
  // The values here are the light defaults, used only when the stylesheet
  // is not loaded (a CDN user who skipped mathviz.css, the Node test stub).
  // `accent3` (teal) exists for pages whose three primary colors are
  // alt/ok/fn and need a hue for each mixed pair -- red+green is warn,
  // red+blue is accent2, green+blue is this. `halo` is the ring drawn around
  // a marker to lift it off whatever it sits on -- white on light, the page
  // background on dark; pages used to hardcode `line: {color: "white"}`
  // for this, which is a white halo on a near-black chart in dark mode.
  const FALLBACK = {
    fn:      "#2563eb",
    alt:     "#dc2626",
    ok:      "#16a34a",
    muted:   "#94a3b8",
    ink:     "#111827",
    warn:    "#f59e0b",
    accent2: "#9333ea",
    accent3: "#0d9488",
    halo:    "#ffffff"
  }

  /**
   * A fresh snapshot of the chart palette for whichever theme is active
   * right now, read from the `--vm-color-<name>` tokens on `<body>`. Call
   * it inside the cell that builds traces -- never cache the object.
   *
   * Any argument is ignored. `VM.plotting.colors(vmTheme)` is written that
   * way purely so the OJS cell depends on `vmTheme` and re-runs on a
   * toggle.
   *
   * @returns {{fn: string, alt: string, ok: string, muted: string, ink: string,
   *   warn: string, accent2: string, accent3: string, halo: string}}
   *   CSS colors, keyed by role. Falls back to the light-mode hexes when
   *   the stylesheet isn't loaded.
   */
  const colors = () => {
    const out = {}
    for (const name of Object.keys(FALLBACK)) out[name] = cssVar("--vm-color-" + name, FALLBACK[name])
    return out
  }

  // Same hue as a palette token, at the given opacity -- for the translucent
  // area/bar fills that pair with a solid stroke of the same color. Pages
  // used to hardcode these as `rgba(22, 163, 74, 0.2)` literals, which stay
  // light-mode green after a theme toggle while their own stroke lightens,
  // so fill and stroke visibly drift apart in dark mode. Accepts a palette
  // token name, a #rgb/#rrggbb hex, or an rgb(r, g, b) string (what a
  // stylesheet may resolve a token to); anything else comes back unchanged.
  const parseColor = (value) => {
    if (typeof value !== "string") return null
    const text = value.trim()
    if (text.startsWith("#")) {
      const clean = text.slice(1)
      if (clean.length !== 3 && clean.length !== 6) return null
      const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16)
      }
    }
    const rgb = text.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
    return null
  }

  /**
   * The same hue as a palette token (or any color string) at a given
   * opacity, for a translucent fill that pairs with a solid stroke.
   *
   * @param {string} token - A palette role (`"fn"`, `"ok"`, ...) resolved
   *   through {@link colors}, or a `#rgb`/`#rrggbb`/`rgb(...)`/`rgba(...)`
   *   string.
   * @param {number} opacity - `0`..`1`; not clamped.
   * @returns {string} `"rgba(r, g, b, opacity)"`. An input that can't be
   *   parsed (a CSS named color, `hsl(...)`, a non-string) is returned
   *   unchanged.
   */
  const alpha = (token, opacity) => {
    const value = token in FALLBACK ? colors()[token] : token
    const parsed = parseColor(value)
    if (!parsed) return value
    return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${opacity})`
  }

  // Plotly's/Plot's automatic color cycle for traces a page didn't color
  // explicitly. `halo` is excluded deliberately -- it's the marker-ring
  // color (white on light, the page background on dark), so cycling a trace
  // onto it would draw that trace in the background color, invisible.
  /**
   * The trace color cycle -- {@link colors} in role order minus `halo`, so
   * an uncolored trace never lands on the background color.
   *
   * @returns {string[]} `[fn, alt, ok, muted, ink, warn, accent2, accent3]`.
   */
  const colorway = () => {
    const active = colors()
    const out = []
    for (const name of Object.keys(FALLBACK)) {
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
  /**
   * The shared Plotly layout, themed from the live tokens: transparent
   * backgrounds, `--vm-font-sans`, themed axes/gridlines/ticks,
   * {@link colorway}, {@link hoverLabel}, modebar colors, a 300 ms tween
   * (`0` under `prefers-reduced-motion`; shortened to the slider gap while
   * a playback sweep runs) and small non-zero margins that `automargin`
   * grows as needed.
   *
   * Not needed when the Plotly patch is installed (it merges this under
   * every `newPlot`/`react` layout), but harmless to call explicitly.
   *
   * @param {Object} [overrides] - Deep-merged on top, so
   *   `{xaxis: {title: "x", range: [0, 1]}}` extends the shared axis chrome
   *   rather than replacing it. Arrays and primitives replace wholesale.
   *   Don't pass `margin: {l: 0, r: 0, t: 0, b: 0}`: it defeats `automargin`.
   * @returns {Object} A Plotly layout object.
   */
  const layout = (overrides) => {
    const text = cssVar("--vm-text", "#14161a")
    const textSoft = cssVar("--vm-text-soft", "#5f6672")
    const grid = cssVar("--vm-grid", "rgba(20, 22, 26, 0.08)")
    const border = cssVar("--vm-border", "rgba(27, 31, 36, 0.15)")
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
      font: { family: fontFamily(), size: 13, color: text },
      xaxis: { ...axisDefaults },
      yaxis: { ...axisDefaults },
      colorway: colorway(),
      hoverlabel: hoverLabel(),
      // Trace `text` labels (the x₀/x₁ callouts next to iteration markers)
      // inherit no color of their own, so without this they render in
      // Plotly's default near-black and disappear on the dark theme.
      textfont: { family: fontFamily(), color: text },
      // Plotly's own modebar chrome. The shape (pill, blur, radius) is CSS
      // in src/css/modebar.css; these are the parts only Plotly can set.
      modebar: {
        bgcolor: "rgba(0,0,0,0)",
        color: textSoft,
        activecolor: accent
      },
      // Tween between steps instead of snapping, so an iteration slider
      // reads as the method advancing rather than as a flicker. Honors the
      // OS reduced-motion setting.
      transition: {
        duration: prefersReducedMotion() ? 0 : (playbackTweenMs() ?? 300),
        easing: "cubic-in-out"
      },
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
  /**
   * Keeps a Plotly graph div sized to its container, and stops once the
   * div leaves the document. Every chart built detached (the usual OJS
   * pattern) needs this, since Plotly measures 0×0 at `newPlot` time.
   *
   * @param {HTMLElement} div - The graph div.
   * @returns {ResizeObserver|null} The observer, or `null` where
   *   `ResizeObserver` doesn't exist. Skips resizing while the div is
   *   hidden (`display: none`) and is safe when Plotly isn't loaded.
   */
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

  /**
   * Replaces each digit with its Unicode subscript, for iteration labels
   * in Plotly trace `text` (which has no markup): `subscript("x10")` is
   * `"x₁₀"`.
   *
   * @param {number|string} value - Coerced with `String()`; non-digits pass through.
   * @returns {string}
   */
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
  /**
   * The themed tooltip style. Set it on each trace's `hoverlabel` as well
   * as the layout's -- Plotly derives a trace's tooltip background from
   * that trace's color unless the trace sets its own, so a layout-level
   * default alone never shows. The Plotly patch does this per trace for you.
   *
   * @returns {{bgcolor: string, bordercolor: string, align: "left",
   *   font: {family: string, size: number, color: string}}}
   */
  const hoverLabel = () => ({
    bgcolor: cssVar("--vm-surface", "#f6f7f9"),
    bordercolor: cssVar("--vm-border", "rgba(27, 31, 36, 0.15)"),
    align: "left",
    font: { family: fontFamily(), size: 12, color: cssVar("--vm-text", "#14161a") }
  })

  // A centered message drawn in the empty plot area, for when a page's
  // `result` cell bailed out (an unparseable expression, a non-finite
  // guess). Without it an invalid formula silently renders an empty grid
  // that looks identical to a valid-but-empty result.
  /**
   * A centered message for an empty plot area, as an `annotations` array:
   * `annotations: f ? [] : VM.plotting.emptyState("Couldn't parse that")`.
   * Without it an unparseable input draws an empty grid indistinguishable
   * from a valid-but-empty result.
   *
   * @param {string} message
   * @returns {Object[]} A one-element Plotly annotations array, positioned
   *   at paper coordinates `(0.5, 0.5)` in `--vm-text-soft`.
   */
  const emptyState = (message) => {
    const textSoft = cssVar("--vm-text-soft", "#5f6672")
    return [{
      text: message,
      xref: "paper",
      yref: "paper",
      x: 0.5,
      y: 0.5,
      showarrow: false,
      font: { family: fontFamily(), size: 14, color: textSoft },
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
  /**
   * The theme-dependent style attributes as a **flat**, dotted-path object
   * for `Plotly.relayout` -- `{"xaxis.gridcolor": ..., colorway: [...]}` --
   * so re-theming a live chart touches only those attributes and leaves
   * the page's own titles and ranges alone. The Plotly patch applies this
   * to every chart on each theme flip; a page shouldn't need to call it.
   *
   * @returns {Object} 24 keys: backgrounds, `font.color`, `textfont.color`,
   *   the three `hoverlabel.*` colors, `modebar.color`/`.activecolor`,
   *   `colorway`, and seven `xaxis.*`/`yaxis.*` colors each.
   */
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
  /**
   * The shared Plotly config: `{responsive: true, displaylogo: false}`. The
   * Plotly patch also merges this under every chart and then sets the
   * modebar button list on top.
   *
   * @param {Object} [overrides] - Deep-merged on top.
   * @returns {Object} A Plotly config object.
   */
  const config = (overrides) => deepMerge({ responsive: true, displaylogo: false }, overrides)

  // The Observable Plot equivalent of layout() -- same font, same grid
  // color, same palette -- so the iterates/convergence Plot charts under a
  // page's main Plotly chart read as the same chart system, not a visually
  // different library bolted on underneath.
  /**
   * The Observable Plot equivalent of {@link layout}: the same font, grid
   * color and {@link colorway}, so a `Plot.plot` beneath a Plotly chart
   * reads as the same chart system.
   *
   * @param {Object} [overrides] - Deep-merged on top. If it names an `x` or
   *   `y` scale without a `stroke`, the axis is stroked in `--vm-border`;
   *   scales it doesn't name are left for Plot to default.
   * @returns {Object} Options for `Plot.plot(...)`.
   */
  const plotOptions = (overrides) => {
    const text = cssVar("--vm-text", "#14161a")
    const grid = cssVar("--vm-grid", "rgba(20, 22, 26, 0.08)")
    const border = cssVar("--vm-border", "rgba(27, 31, 36, 0.15)")
    const base = {
      style: { fontFamily: fontFamily(), fontSize: 12, color: text },
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
    return merged
  }

  globalThis.VM = {
    ...globalThis.VM,
    plotting: {
      ...globalThis.VM?.plotting,
      configure, colors, colorway, alpha, themeName, onThemeChange, subscript, autoResize,
      layout, config, plotOptions, themePatch, emptyState, hoverLabel
    }
  }
})(window)
