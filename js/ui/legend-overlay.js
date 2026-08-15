/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Renders a small floating panel of clickable legend items (colored
  // swatch + label) that toggle which traces a chart shows -- meant to sit
  // absolutely-positioned on top of a Plotly chart (see .ojs-plot-overlay /
  // .ojs-legend-overlay in styles.css) in place of a separate checkbox row
  // in the controls panel.
  //
  // Implements Observable Inputs' view contract (a `value` property, an
  // "input" event on change) so it slots into `viewof <name> =
  // VM.ui.legendOverlay(...)` exactly like Inputs.checkbox, including
  // VM.ui.applyExampleParams's `view.value = ...; view.dispatchEvent(new
  // Event("input"))` protocol used to apply examples -- the `value` setter
  // below re-renders each item's checked state, so a programmatic set stays
  // visually in sync with a user click.
  //
  // items: [{label, color}, ...] in display (and returned-array) order.
  // options.value: initially-checked labels; defaults to every label.
  const legendOverlay = (items, options = {}) => {
    const selected = new Set(options.value ?? items.map(item => item.label))

    const root = document.createElement("div")
    root.className = "ojs-legend-overlay"

    const rowByLabel = new Map()

    const render = () => {
      for (const item of items) {
        rowByLabel.get(item.label).setAttribute("aria-checked", String(selected.has(item.label)))
      }
    }

    const toggle = label => {
      if (selected.has(label)) selected.delete(label)
      else selected.add(label)
      render()
      root.dispatchEvent(new Event("input", {bubbles: true}))
    }

    for (const item of items) {
      const row = document.createElement("div")
      row.className = "ojs-legend-item"
      row.setAttribute("role", "checkbox")
      row.setAttribute("tabindex", "0")

      const swatch = document.createElement("span")
      swatch.className = "ojs-legend-swatch"
      swatch.style.background = item.color

      const text = document.createElement("span")
      text.textContent = item.label

      row.append(swatch, text)
      root.append(row)
      rowByLabel.set(item.label, row)

      row.addEventListener("click", () => toggle(item.label))
      row.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        toggle(item.label)
      })
    }

    render()

    Object.defineProperty(root, "value", {
      get() {
        const checked = []
        for (const item of items) if (selected.has(item.label)) checked.push(item.label)
        return checked
      },
      set(next) {
        selected.clear()
        for (const label of next ?? []) selected.add(label)
        render()
      }
    })

    return root
  }

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, legendOverlay}}
})(window)
