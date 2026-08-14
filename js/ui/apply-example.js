/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Applies an example's params to the page's viewof fields, then clicks
  // triggerEl to run the same commit flow a real user click would (updates
  // result and rewrites the URL) — used by both the top dropdown and the
  // generated example grid so an example applies in place, with no page
  // navigation/reload/scroll jump.
  //
  // fieldSelectors is a page-local {paramKey: cssSelector} object of plain
  // strings, deliberately NOT direct viewof references: some fields (e.g.
  // a range slider whose bounds depend on a "max" field elsewhere) get
  // their view recreated by OJS whenever an upstream field changes, and a
  // cell that references such a view by name becomes reactive on it. Since
  // this function is itself what changes the upstream field, a cell built
  // from direct references would re-run every time its own write
  // recreated a downstream view — a feedback loop with no natural end
  // (observed hitting Chrome's history-API throttling before settling).
  // Looking the current view up via `document.querySelector` at the
  // moment it's needed carries no such reactive dependency, so it's immune
  // to that cycle regardless of how the DOM was reached there. Each field
  // that can be targeted this way is tagged with a stable
  // `data-example-field` attribute by the cell that owns it.
  //
  // Setting a view's `.value` and dispatching a real "input" event on the
  // view itself (rather than reaching into its inner DOM) is Observable
  // Inputs' documented way to drive a view programmatically, and works
  // uniformly for text fields, range sliders, and checkbox groups.
  //
  // Params are applied one at a time with a yield between each, giving the
  // reactive runtime a chance to finish any cascade (e.g. recreate a
  // dependent slider) before the next field is looked up. The yield is a
  // fixed 100ms delay, not a single microtask/macrotask tick — measured
  // directly, OJS's own reactive updates settle in ~40ms (consistent with
  // requestAnimationFrame-paced batching, not same-tick propagation), so a
  // `setTimeout(resolve, 0)` yield resolves before the cascade finishes:
  // the next field gets applied to a view that's about to be replaced,
  // silently discarding it once the delayed recreation catches up. 100ms
  // gives comfortable margin; this only runs once per user example
  // selection, so it isn't perf-sensitive. Callers should order a params
  // object so an upstream field (e.g. "max") appears before any field that
  // depends on it (e.g. "n").
  //
  // Callers should invoke this from a plain DOM event listener attached
  // once to a stable element (the same pattern most pages already use for
  // `enterToPlot`), not from an OJS cell that's reactive on a <select>'s
  // value: a native <select> fires both "input" and "change" for one
  // selection, and a cell reactive on that value re-runs once per event —
  // two overlapping calls race to apply the same params, and the second
  // pass's field-recreation cascade can stomp the first pass's result.
  const applyExampleParams = async (fieldSelectors, params, triggerEl) => {
    for (const key in params) {
      const selector = fieldSelectors[key]
      if (!selector) continue
      const view = document.querySelector(selector)
      if (!view) continue
      view.value = params[key]
      view.dispatchEvent(new Event("input", {bubbles: true}))
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    const button = triggerEl.querySelector("button")
    if (button) button.click()
  }

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, applyExampleParams}}
})(window)
