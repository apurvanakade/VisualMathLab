/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Resize the plot once the browser finishes entering/leaving fullscreen —
  // Plotly doesn't know the div's size changed on its own. When the
  // fullscreened element is a .ojs-plot-overlay wrapper (see below) rather
  // than the Plotly graph div itself, Plotly.Plots.resize needs the actual
  // graph div (Plotly tags it "js-plotly-plot"), not the wrapper.
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement && globalThis.Plotly) {
      const gd = document.fullscreenElement.querySelector(".js-plotly-plot") || document.fullscreenElement
      globalThis.Plotly.Plots.resize(gd)
    }
  })

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

  // Patch Plotly.newPlot/react so every chart gets the button automatically,
  // and box/lasso select are dropped from the modebar (this site's charts
  // use selection-free zoom/pan, not point selection) with pan as the
  // default drag tool instead of Plotly's own default of box zoom —
  // pages call Plotly.newPlot(gd, data, layout, config) as plain imperative
  // code (see CLAUDE.md), so no per-page wiring is needed or expected.
  const addButton = (config) => {
    const buttons = (config && config.modeBarButtonsToAdd) || []
    const removedButtons = (config && config.modeBarButtonsToRemove) || []
    return {
      ...config,
      modeBarButtonsToAdd: [...buttons, fullscreenButton],
      modeBarButtonsToRemove: [...removedButtons, "select2d", "lasso2d"]
    }
  }
  const withDefaultDragmode = (layout) => {
    if (layout && layout.dragmode !== undefined) return layout
    return {...layout, dragmode: "pan"}
  }
  for (const name of ["newPlot", "react"]) {
    const original = globalThis.Plotly[name]
    globalThis.Plotly[name] = (gd, data, layout, config) => original(gd, data, withDefaultDragmode(layout), addButton(config))
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, fullscreenButton}}
})(window)
