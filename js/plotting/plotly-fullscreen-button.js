/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // In fullscreen the chart is letterboxed to its on-page aspect ratio (see
  // styles.css), so it no longer spans the screen — but the step bar beneath
  // it is a plain block that does, leaving a control strip visibly wider than
  // the chart it drives. Matching the two can't be written in CSS: the bar's
  // width follows the chart's, the chart's width follows the height left over
  // once the bar has taken its share, and the bar's height follows its own
  // width again (an .ojs-grid bar rewraps into more rows as it narrows).
  // Measuring the chart the browser has already laid out cuts that cycle.
  //
  // Narrowing the bar can still change its height and so the chart's width,
  // which is what the ResizeObserver below is for: it re-measures until the
  // two agree. That settles in one pass for a bar that doesn't rewrap and two
  // for one that does. MAX_SETTLE_PASSES is a backstop in case some layout
  // oscillates between two widths rather than converging — giving up leaves
  // the bar at a measured chart width, which is never wider than the screen,
  // so the failure mode is a few pixels of mismatch rather than an overflow
  // or a spin.
  const BAR_WIDTH_PROP = "--vm-fs-plot-width"
  const MAX_SETTLE_PASSES = 6
  let barWidthObserver = null
  let settlePasses = 0

  const clearBarWidth = () => {
    for (const el of document.querySelectorAll(".ojs-plot-overlay")) {
      el.style.removeProperty(BAR_WIDTH_PROP)
    }
  }

  const syncBarWidth = () => {
    const target = document.fullscreenElement
    if (!target || typeof target.querySelector !== "function") return
    const gd = target.querySelector(".js-plotly-plot")
    const bar = target.querySelector(".ojs-step-overlay")
    if (!gd || !bar) return
    const width = Math.round(gd.getBoundingClientRect().width)
    if (width <= 0) return
    // Sub-pixel churn is the observer chasing its own rounding, not a real
    // change; NaN on the first pass compares false and falls through to set.
    const applied = parseFloat(target.style.getPropertyValue(BAR_WIDTH_PROP))
    if (Math.abs(applied - width) < 1) return
    if (settlePasses >= MAX_SETTLE_PASSES) return
    settlePasses += 1
    target.style.setProperty(BAR_WIDTH_PROP, width + "px")
  }

  // Resize the plot once the browser finishes entering/leaving fullscreen —
  // Plotly doesn't know the div's size changed on its own. When the
  // fullscreened element is a .ojs-plot-overlay wrapper (see below) rather
  // than the Plotly graph div itself, Plotly.Plots.resize needs the actual
  // graph div (Plotly tags it "js-plotly-plot"), not the wrapper.
  document.addEventListener("fullscreenchange", () => {
    if (barWidthObserver) {
      barWidthObserver.disconnect()
      barWidthObserver = null
    }
    settlePasses = 0

    const target = document.fullscreenElement
    if (!target) {
      // Back on the page the bar spans its column again, same as any other
      // chart, so the override has to go rather than linger at a stale width.
      clearBarWidth()
      return
    }

    if (globalThis.Plotly) {
      const gd = target.querySelector(".js-plotly-plot") || target
      globalThis.Plotly.Plots.resize(gd)
    }

    syncBarWidth()

    if (typeof ResizeObserver === "undefined") return
    const gd = target.querySelector(".js-plotly-plot")
    const bar = target.querySelector(".ojs-step-overlay")
    if (!gd || !bar) return
    // The chart for a width to copy, the bar because its own height is the
    // other half of the loop.
    barWidthObserver = new ResizeObserver(syncBarWidth)
    barWidthObserver.observe(gd)
    barWidthObserver.observe(bar)
  })

  // A genuine viewport change (rotating a tablet, resizing the window while
  // fullscreen) is a fresh layout, not another settle pass, so it gets its
  // own budget.
  //
  // Feature-detected because scripts/load-vm.mjs runs every file listed in
  // head-scripts.html against a minimal stub so the unit tests can exercise
  // the real functions, and that stub's `window` is Node's globalThis, which
  // has no addEventListener — the same reason js/ui/draggable-overlay.js
  // checks before touching the DOM. `document.addEventListener` above is
  // safe: the stub does provide that one.
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("resize", () => {
      settlePasses = 0
    })
  }

  // A Plotly modebar button (add via config.modeBarButtonsToAdd) that
  // toggles the graph div into the browser's native fullscreen mode.
  // Icon path is Bootstrap Icons' "arrows-fullscreen" (MIT), matching the
  // rest of the site's iconography.
  const fullscreenButton = {
    name: "fullscreen",
    title: "Toggle fullscreen",
    icon: {
      width: 16,
      height: 16,
      path: "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"
    },
    click: (gd) => {
      // Fullscreen the .ojs-plot-overlay wrapper when present, not just the
      // graph div gd itself -- pages with a VM.ui.legendOverlay checkbox
      // legend (js/ui/legend-overlay.js) position it as a sibling of gd
      // inside that wrapper, and the Fullscreen API only keeps descendants
      // of the fullscreened element visible, so fullscreening gd alone
      // would hide the legend. Pages without that wrapper fall back to
      // fullscreening gd, same as before.
      const target = gd.closest(".ojs-plot-overlay") || gd
      if (document.fullscreenElement === target) {
        document.exitFullscreen()
      } else {
        // Record the chart's on-page aspect ratio before entering fullscreen
        // so styles.css (`:fullscreen .js-plotly-plot`) can letterbox the
        // chart at that ratio instead of stretching it to fill the screen.
        const rect = gd.getBoundingClientRect()
        if (rect.height > 0) {
          gd.style.setProperty("--vm-plot-aspect-ratio", String(rect.width / rect.height))
        }
        target.requestFullscreen()
      }
    }
  }

  // Plotly's own zoom in/out buttons step by a factor of 2 -- one click
  // halves or doubles the visible span, which overshoots badly when you're
  // trying to frame a curve. These replace them with a gentler step; this
  // one constant is the whole knob.
  const ZOOM_STEP = 1.25

  const zoomBy = (gd, factor) => {
    const Plotly = globalThis.Plotly
    const update = {}
    // _fullLayout rather than gd.layout: an axis left to autorange has no
    // range in the supplied layout at all, only a computed one here.
    for (const key of Object.keys(gd._fullLayout)) {
      if (!/^[xy]axis\d*$/.test(key)) continue
      const axis = gd._fullLayout[key]
      if (!axis.range || axis.fixedrange) continue
      // r2l/l2r so a log or date axis zooms about its own linearized
      // midpoint, instead of having raw range values scaled arithmetically.
      const lo = axis.r2l(axis.range[0])
      const hi = axis.r2l(axis.range[1])
      const middle = (lo + hi) / 2
      const half = (hi - lo) / 2 * factor
      update[key + ".range"] = [axis.l2r(middle - half), axis.l2r(middle + half)]
    }
    Plotly.relayout(gd, update)
  }

  const zoomInButton = {
    name: "zoomIn",
    title: "Zoom in",
    icon: globalThis.Plotly.Icons.zoom_plus,
    click: (gd) => zoomBy(gd, 1 / ZOOM_STEP)
  }

  const zoomOutButton = {
    name: "zoomOut",
    title: "Zoom out",
    icon: globalThis.Plotly.Icons.zoom_minus,
    click: (gd) => zoomBy(gd, ZOOM_STEP)
  }

  // Patch Plotly.newPlot/react so every chart gets the button automatically,
  // and box/lasso select are dropped from the modebar (this site's charts
  // use selection-free zoom/pan, not point selection) with pan as the
  // default drag tool instead of Plotly's own default of box zoom —
  // pages call Plotly.newPlot(gd, data, layout, config) as plain imperative
  // code (see CLAUDE.md), so no per-page wiring is needed or expected.
  // Spelled out as an explicit modeBarButtons list rather than the
  // ToAdd/ToRemove pair, because swapping the two zoom buttons for the
  // gentler ones above via ToRemove+ToAdd would also relocate them to the
  // end of the bar (added buttons always append), shuffling an otherwise
  // familiar modebar. This keeps Plotly's own cartesian order intact, minus
  // box/lasso select. Every chart on this site is 2D cartesian, which is
  // what makes hardcoding this list safe.
  const addButton = (config) => {
    return {
      ...config,
      modeBarButtons: [
        ["toImage"],
        ["zoom2d", "pan2d"],
        [zoomInButton, zoomOutButton, "autoScale2d", "resetScale2d"],
        [fullscreenButton]
      ]
    }
  }
  const withDefaultDragmode = (layout) => {
    if (layout && layout.dragmode !== undefined) return layout
    return {...layout, dragmode: "pan"}
  }
  // Layers the shared theme (js/plotting/chart-theme.js) UNDER whatever
  // layout a page passes, so every existing mainPlot cell picks up
  // themed axes/fonts/background with no page-level edit -- a page's own
  // layout keys (margin, xaxis.range, ...) still win where they overlap,
  // since VM.plotting.layout deep-merges the page's object on top of its
  // own defaults.
  const withTheme = (layout) => {
    if (!globalThis.VM?.plotting?.layout) return layout
    return globalThis.VM.plotting.layout(layout)
  }
  // layout.hoverlabel is not enough on its own: Plotly derives each trace's
  // hover-label background from that *trace's* own color unless the trace
  // sets hoverlabel itself, so the shared layout default never applies and
  // every tooltip renders as a light box regardless of theme. Injecting the
  // themed hoverlabel per trace here keeps that fix in one place instead of
  // on every trace on every page.
  const withTraceDefaults = (data) => {
    if (!Array.isArray(data) || !globalThis.VM?.plotting?.hoverLabel) return data
    const hoverlabel = globalThis.VM.plotting.hoverLabel()
    const out = []
    for (const trace of data) {
      if (!trace || typeof trace !== "object" || trace.hoverlabel !== undefined) {
        out.push(trace)
        continue
      }
      out.push({ ...trace, hoverlabel })
    }
    return out
  }

  for (const name of ["newPlot", "react"]) {
    const original = globalThis.Plotly[name]
    globalThis.Plotly[name] = (gd, data, layout, config) =>
      original(gd, withTraceDefaults(data), withDefaultDragmode(withTheme(layout)), addButton(globalThis.VM?.plotting?.config ? globalThis.VM.plotting.config(config) : config))
  }

  // A page's chart is normally re-themed the next time it reactively
  // rebuilds (Plotly.react runs VM.plotting.layout() fresh every call, per
  // withTheme above) -- but toggling dark mode alone doesn't touch any
  // OJS input, so nothing would otherwise trigger that rebuild. Watch
  // <body>'s class for the quarto-dark/quarto-light flip
  // (toggleBodyColorMode in Quarto's own inline script is what sets it,
  // see docs/**/*.html) and relayout every live chart on the page
  // immediately, without needing a per-page listener.
  //
  // Registration is deferred to DOMContentLoaded. This file is loaded from
  // _includes/head-scripts.html via include-in-header, i.e. from <head> --
  // at which point document.body is still null, so guarding on
  // `document.body` and registering inline (which this did) silently
  // skipped the observer on every page and the toggle re-themed nothing.
  const watchThemeToggle = () => {
    if (typeof document === "undefined" || !document.body) return
    if (typeof MutationObserver === "undefined") return
    const repaint = () => {
      if (!globalThis.Plotly?.relayout || !globalThis.VM?.plotting?.themePatch) return
      for (const gd of document.querySelectorAll(".js-plotly-plot")) {
        globalThis.Plotly.relayout(gd, globalThis.VM.plotting.themePatch())
      }
    }

    // <body>'s class list is not the theme's alone -- the sidebar rail writes
    // .vm-sidebar-open to it on every hover-to-preview and .vm-sidebar-pinned
    // on every pin (_includes/sidebar-rail.html). Without this check, opening
    // the sidebar relayouted every chart on the page for nothing.
    let lastTheme = globalThis.VM?.plotting?.themeName?.()

    const themeObserver = new MutationObserver(() => {
      // Deferred by two frames, not run inline. Quarto's toggle flips the
      // body class and swaps the light/dark stylesheet as separate steps,
      // and the class lands first -- so reading --vm-* here synchronously
      // returns the *outgoing* theme's tokens (measured: colorway, which
      // comes from classList, flipped correctly while hoverlabel.bgcolor,
      // which comes from getComputedStyle, stayed on the light surface).
      // One frame for the stylesheet to apply, one for style recalc. The
      // theme comparison goes inside that wait, not around it, so a real
      // toggle still gets both frames before anything reads a token.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const theme = globalThis.VM?.plotting?.themeName?.()
        if (theme === lastTheme) return
        lastTheme = theme
        repaint()
      }))
    })
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] })
  }

  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchThemeToggle)
  } else {
    watchThemeToggle()
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, fullscreenButton}}
})(window)
