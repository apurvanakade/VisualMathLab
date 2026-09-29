/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Every chart on a mathviz page is the same closure: create the graph div
  // on the first call with Plotly.newPlot, reuse it with Plotly.react on
  // every later one (which is what keeps a reader's zoom and pan while a
  // slider moves, together with `uirevision`), and hand the div to
  // VM.plotting.autoResize, because it was built detached and Plotly
  // measured it at 0x0. Pages with several charts wrote that closure once
  // per chart; this is it, once.
  /**
   * A reusable Plotly chart for an OJS cell. Call it once in a cell that
   * depends on nothing reactive, then call the returned function from the
   * cell that builds the traces:
   *
   *     mainPlot = VM.plotting.persistentPlot()
   *     mainPlot(data, layout)            // in the display cell
   *
   * @param {Object} [opts]
   * @param {string} [opts.className="plotly-box-large"] - Class of the
   *   graph div; `plotly-box-large` is mathviz's 72vh main-chart box.
   * @param {string} [opts.height] - Inline CSS height, for a secondary chart
   *   that shouldn't take the main chart's box (e.g. `"320px"`).
   * @returns {(data: Object[], layout: Object, config?: Object) => HTMLElement}
   *   Draws or redraws and returns the same div every time. `config`
   *   defaults to `VM.plotting.config()`.
   */
  const persistentPlot = (opts = {}) => {
    const className = opts.className ?? "plotly-box-large"
    let div = null

    return (data, layout, config) => {
      const Plotly = globalThis.Plotly
      const plotConfig = config ?? globalThis.VM.plotting.config()
      if (div === null) {
        div = document.createElement("div")
        div.className = className
        if (opts.height !== undefined) div.style.height = opts.height
        Plotly.newPlot(div, data, layout, plotConfig)
        globalThis.VM.plotting.autoResize(div)
      } else {
        Plotly.react(div, data, layout, plotConfig)
      }
      return div
    }
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, persistentPlot}}
})(window)
