/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // In fullscreen the chart is letterboxed to its on-page aspect ratio (see
  // src/css/chart-block.css), so it no longer spans the screen — but the controls bar
  // above it is a plain block that does, leaving a control strip visibly wider
  // than the chart it drives. Matching the two can't be written in CSS: the bar's
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
    for (const el of document.querySelectorAll(".ojs-chart-block")) {
      el.style.removeProperty(BAR_WIDTH_PROP)
    }
  }

  const syncBarWidth = () => {
    const target = document.fullscreenElement
    if (!target || typeof target.querySelector !== "function") return
    const gd = target.querySelector(".js-plotly-plot")
    const bar = target.querySelector(".ojs-chart-controls")
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
  // fullscreened element is a .ojs-chart-block wrapper (see below) rather
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

    // A block with no Plotly chart in it -- a page that draws its own SVG
    // and fullscreens the same .ojs-chart-block wrapper (e.g.
    // apps/positive-predictive-value/index.qmd) -- has nothing to resize.
    let gd = target
    if (!gd.classList.contains("js-plotly-plot")) gd = target.querySelector(".js-plotly-plot")
    if (globalThis.Plotly && gd) {
      globalThis.Plotly.Plots.resize(gd)
    }

    syncBarWidth()

    if (typeof ResizeObserver === "undefined") return
    const bar = target.querySelector(".ojs-chart-controls")
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
  // src/manifest.mjs against a minimal stub so the unit tests can exercise
  // the real functions, and that stub's `window` is Node's globalThis, which
  // has no addEventListener — the same reason ui/draggable-overlay.js
  // checks before touching the DOM. `document.addEventListener` above is
  // safe: the stub does provide that one.
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("resize", () => {
      settlePasses = 0
    })
  }

  // Icon path is Bootstrap Icons' "arrows-fullscreen" (MIT), matching the
  // rest of the site's iconography.
  /**
   * The fullscreen modebar button, in Plotly's custom-button shape. The
   * patch adds it to every chart; a page only touches this to reuse its
   * glyph (`VM.plotting.fullscreenButton.icon`, as the SVG fullscreen
   * button does) or to add it to a chart built outside the patch.
   *
   * Clicking fullscreens the nearest `.ojs-chart-block` (so the controls
   * bar and legend come along) or, without one, the graph div itself, and
   * exits when that element is already fullscreen.
   *
   * @type {{name: "fullscreen", title: string,
   *   icon: {width: number, height: number, path: string},
   *   click: (gd: HTMLElement) => void}}
   */
  const fullscreenButton = {
    name: "fullscreen",
    title: "Toggle fullscreen",
    icon: {
      width: 16,
      height: 16,
      path: "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"
    },
    click: (gd) => {
      // Fullscreen the .ojs-chart-block wrapper when present, not just the
      // graph div gd itself -- pages with a VM.ui.legendOverlay checkbox
      // legend (js/ui/legend-overlay.js) position it as a sibling of gd
      // inside that wrapper, and the Fullscreen API only keeps descendants
      // of the fullscreened element visible, so fullscreening gd alone
      // would hide the legend. Pages without that wrapper fall back to
      // fullscreening gd, same as before.
      const target = gd.closest(".ojs-chart-block") || gd
      if (document.fullscreenElement === target) {
        document.exitFullscreen()
      } else {
        // Record the chart's on-page aspect ratio before entering fullscreen
        // so chart-block.css (`:fullscreen .js-plotly-plot`) can letterbox the
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

  const zoomInButton = (Plotly) => ({
    name: "zoomIn",
    title: "Zoom in",
    icon: Plotly.Icons.zoom_plus,
    click: (gd) => zoomBy(gd, 1 / ZOOM_STEP)
  })

  const zoomOutButton = (Plotly) => ({
    name: "zoomOut",
    title: "Zoom out",
    icon: Plotly.Icons.zoom_minus,
    click: (gd) => zoomBy(gd, ZOOM_STEP)
  })

  // Patch Plotly.newPlot/react so every chart gets the button automatically,
  // and box/lasso select are dropped from the modebar (these charts
  // use selection-free zoom/pan, not point selection) with pan as the
  // default drag tool instead of Plotly's own default of box zoom —
  // pages call Plotly.newPlot(gd, data, layout, config) as plain imperative
  // code, so no per-page wiring is needed or expected.
  // Spelled out as an explicit modeBarButtons list rather than the
  // ToAdd/ToRemove pair, because swapping the two zoom buttons for the
  // gentler ones above via ToRemove+ToAdd would also relocate them to the
  // end of the bar (added buttons always append), shuffling an otherwise
  // familiar modebar. This keeps Plotly's own cartesian order intact, minus
  // box/lasso select. Every chart this library was built for is 2D
  // cartesian, which is what makes hardcoding this list safe.
  const addButton = (Plotly, config) => {
    return {
      ...config,
      modeBarButtons: [
        ["toImage"],
        ["zoom2d", "pan2d"],
        [zoomInButton(Plotly), zoomOutButton(Plotly), "autoScale2d", "resetScale2d"],
        [fullscreenButton]
      ]
    }
  }
  const withDefaultDragmode = (layout) => {
    if (layout && layout.dragmode !== undefined) return layout
    return {...layout, dragmode: "pan"}
  }
  // Layers the shared theme (chart-theme.js) UNDER whatever
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

  // Installs the newPlot/react patch onto whatever Plotly is on the page.
  // Idempotent, and a no-op (returning false) when Plotly isn't loaded --
  // this library is also used on pages that draw with D3 or a canvas and
  // never load Plotly at all, and a load-time `globalThis.Plotly.newPlot`
  // there would throw and take the rest of the bundle down with it. Runs
  // once at load and once more on DOMContentLoaded, so a Plotly tag placed
  // after this one is still picked up; a page that loads Plotly later than
  // that (dynamic import) calls VM.plotting.installPlotlyPatch() itself.
  /**
   * Patches `Plotly.newPlot` and `Plotly.react` so every chart gets the
   * themed layout, per-trace hover labels, `dragmode: "pan"` (unless the
   * page set one) and the shared modebar. Runs by itself at load and on
   * `DOMContentLoaded`; call it only when Plotly arrives later than that.
   *
   * @returns {boolean} `true` once patched (also when already patched);
   *   `false` when `Plotly` isn't on the page.
   */
  const installPlotlyPatch = () => {
    const Plotly = globalThis.Plotly
    if (!Plotly || typeof Plotly.newPlot !== "function") return false
    if (Plotly.__vmPatched) return true
    for (const name of ["newPlot", "react"]) {
      const original = Plotly[name]
      Plotly[name] = (gd, data, layout, config) =>
        original(gd, withTraceDefaults(data), withDefaultDragmode(withTheme(layout)), addButton(Plotly, globalThis.VM?.plotting?.config ? globalThis.VM.plotting.config(config) : config))
    }
    Plotly.__vmPatched = true
    return true
  }

  // A page's chart is normally re-themed the next time it reactively
  // rebuilds (Plotly.react runs VM.plotting.layout() fresh every call, per
  // withTheme above) -- but toggling dark mode alone doesn't touch any
  // OJS input, so nothing would otherwise trigger that rebuild. Subscribe to
  // the shared theme watcher (chart-theme.js's onThemeChange, which already
  // knows which selector means "dark", defers two frames for the stylesheet
  // swap, and ignores unrelated <body> class churn) and relayout every live
  // chart on the page immediately, without needing a per-page listener.
  //
  // Registration is deferred to DOMContentLoaded. This file is loaded from
  // <head> -- at which point document.body is still null, so guarding on
  // `document.body` and registering inline (which this did) silently
  // skipped the observer on every page and the toggle re-themed nothing.
  const watchThemeToggle = () => {
    if (typeof document === "undefined" || !document.body) return
    if (!globalThis.VM?.plotting?.onThemeChange) return
    const repaint = () => {
      if (!globalThis.Plotly?.relayout || !globalThis.VM?.plotting?.themePatch) return
      for (const gd of document.querySelectorAll(".js-plotly-plot")) {
        globalThis.Plotly.relayout(gd, globalThis.VM.plotting.themePatch())
      }
    }
    // onThemeChange calls back once immediately with the current theme;
    // there is nothing to repaint yet at that point, only on a later flip.
    let first = true
    globalThis.VM.plotting.onThemeChange(() => {
      if (first) {
        first = false
        return
      }
      repaint()
    })
  }

  const onReady = () => {
    installPlotlyPatch()
    watchThemeToggle()
  }

  installPlotlyPatch()
  if (typeof document !== "undefined" && document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady)
  } else {
    onReady()
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, fullscreenButton, installPlotlyPatch}}
})(window)
