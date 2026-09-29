/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // A Monte Carlo app's headline output is a handful of numbers -- the
  // estimate, its standard error, an acceptance rate -- that change on
  // every slider move. A results table is too heavy for that and a chart
  // title too cramped, so they sit in one row of label-over-value tiles
  // between the controls panel and the chart (inside the page's .vm-app,
  // so an embedded app keeps them). Styled by stat-row.css.
  /**
   * A row of small "label / value" readouts.
   *
   * @param {Array<{label: string, value: (string|number), title?: string}>} items -
   *   One tile each, in order. A number `value` is shown as-is (format it
   *   first); `title` becomes the tile's tooltip, for a definition too long
   *   for the label.
   * @returns {HTMLDivElement} `<div class="vm-stat-row">` holding one
   *   `<div class="vm-stat">` per item, each a `.vm-stat-label` and a
   *   `.vm-stat-value`.
   */
  const statRow = (items) => {
    const row = document.createElement("div")
    row.className = "vm-stat-row"
    for (const item of items) {
      const tile = document.createElement("div")
      tile.className = "vm-stat"
      if (item.title) tile.title = item.title

      const label = document.createElement("div")
      label.className = "vm-stat-label"
      label.textContent = item.label

      const value = document.createElement("div")
      value.className = "vm-stat-value"
      value.textContent = String(item.value)

      tile.append(label, value)
      row.append(tile)
    }
    return row
  }

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, statRow}}
})(window)
