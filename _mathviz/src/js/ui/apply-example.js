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
  // navigation/reload/scroll jump. syncExampleSelect, below, keeps that
  // dropdown naming the example the fields currently hold.
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
  /**
   * Applies an example's parameter values to the page's `viewof` fields,
   * then clicks the page's own "plot"/"run" button so the normal commit
   * flow (recompute, rewrite the URL) happens with no reload or scroll.
   *
   * @param {Object<string, string>} fieldSelectors - `{paramKey: cssSelector}`,
   *   plain strings looked up fresh with `document.querySelector` -- e.g.
   *   `{fx: '[data-example-field="fx"]'}`. Never direct `viewof` references.
   * @param {Object<string, *>} params - `{paramKey: value}`, applied in
   *   insertion order with a 100 ms wait after **each** (including the
   *   last), so a field whose bounds depend on an earlier one sees its
   *   recreated view. Order upstream fields first. Keys with no selector,
   *   or whose element isn't on the page, are skipped.
   * @param {Element} triggerEl - An element containing the `<button>` to
   *   click at the end (e.g. a `viewof` button's wrapper). Must not be
   *   null; the click is skipped if it holds no button.
   * @returns {Promise<void>}
   */
  const applyExampleParams = async (fieldSelectors, params, triggerEl) => {
    // While this runs, the fields pass through states that match no example
    // (one field applied, the rest not yet), and syncExampleSelect below
    // would flip the dropdown to "Custom inputs" and back once per field.
    // The dropdown already shows the example being applied, so it simply
    // skips while any apply is in flight.
    applying += 1
    try {
      for (const key in params) {
        const selector = fieldSelectors[key]
        if (!selector) continue
        const view = document.querySelector(selector)
        if (!view) continue
        view.value = params[key]
        view.dispatchEvent(new Event("input", {bubbles: true}))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      applying -= 1
    }
    const button = triggerEl.querySelector("button")
    if (button) button.click()
  }

  let applying = 0

  // Loose equality between a field's current value and an example's param:
  // params are mostly the strings a URL would carry ("20") while a slider's
  // value is a number (20), so scalars compare as trimmed strings. Arrays
  // (checkbox groups) compare element by element, in order; plain objects
  // (the Butcher tableau's {a, b, c}) compare key by key.
  const sameValue = (current, expected) => {
    if (Array.isArray(current) || Array.isArray(expected)) {
      if (!Array.isArray(current) || !Array.isArray(expected)) return false
      if (current.length !== expected.length) return false
      for (let i = 0; i < current.length; i++) {
        if (!sameValue(current[i], expected[i])) return false
      }
      return true
    }
    const currentIsObject = current !== null && typeof current === "object"
    const expectedIsObject = expected !== null && typeof expected === "object"
    if (currentIsObject || expectedIsObject) {
      if (!currentIsObject || !expectedIsObject) return false
      const keys = new Set([...Object.keys(current), ...Object.keys(expected)])
      for (const key of keys) {
        if (!sameValue(current[key], expected[key])) return false
      }
      return true
    }
    return String(current).trim() === String(expected).trim()
  }

  /**
   * Finds the example whose params all equal the given field values.
   *
   * @param {Array<{title: string, params: Object<string, *>}>} examples
   * @param {Object<string, *>} values - `{paramKey: currentValue}`. A param
   *   key with no entry here (a field this page doesn't have) is ignored.
   * @returns {Object|null} The first matching example, or null when none
   *   match (or when no param key has a value to compare against).
   */
  const findMatchingExample = (examples, values) => {
    for (const example of examples) {
      let compared = 0
      let matches = true
      for (const key in example.params) {
        if (!(key in values)) continue
        compared += 1
        if (!sameValue(values[key], example.params[key])) {
          matches = false
          break
        }
      }
      if (matches && compared > 0) return example
    }
    return null
  }

  /**
   * Points the "Try an example" dropdown at whichever example the page's
   * fields currently hold, so it never names an example the chart isn't
   * showing. Call it from a cell that reads every example field's value,
   * so it re-runs whenever one changes.
   *
   * The dropdown's options are `[null, ...examples]`: the `null` entry,
   * formatted "Custom inputs", is shown only when no example matches (a
   * shared link with its own inputs, or a field the reader has edited). It
   * is disabled and hidden in the list, so it can't be picked.
   *
   * Sets the view's value without dispatching an event, so nothing
   * downstream re-runs and the page's "change" listener doesn't re-apply.
   *
   * @param {Element} selectView - The `viewof exampleSelect` element.
   * @param {Array<{title: string, params: Object<string, *>}>} examples
   * @param {Object<string, string>} fieldSelectors - Same as
   *   {@link applyExampleParams}'s.
   * @returns {void}
   */
  const syncExampleSelect = (selectView, examples, fieldSelectors) => {
    const nativeSelect = selectView.querySelector("select")
    if (nativeSelect && nativeSelect.options.length > 0) {
      nativeSelect.options[0].disabled = true
      nativeSelect.options[0].hidden = true
    }
    if (applying > 0) return
    const values = {}
    for (const key in fieldSelectors) {
      const view = document.querySelector(fieldSelectors[key])
      if (view) values[key] = view.value
    }
    const match = findMatchingExample(examples, values)
    if (selectView.value !== match) selectView.value = match
  }

  globalThis.VM = {
    ...globalThis.VM,
    ui: {...globalThis.VM?.ui, applyExampleParams, findMatchingExample, syncExampleSelect}
  }
})(window)
