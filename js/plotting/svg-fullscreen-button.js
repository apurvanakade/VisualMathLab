/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // A fullscreen button for chart blocks that draw inline SVG (Observable
  // Plot, or a hand-built <svg>) instead of a Plotly chart. A Plotly chart
  // gets one for free from the modebar that js/plotting/plotly-fullscreen-
  // button.js patches onto every graph div; an SVG has no modebar, so the
  // same affordance has to be added from outside. Both fullscreen the same
  // .ojs-chart-block wrapper, so the slider bar above the picture comes
  // along either way.
  //
  // Delegated and self-installing, like js/ui/draggable-overlay.js: a page
  // opts in by adding `ojs-svg-block` next to `ojs-chart-block` on the
  // wrapper, and this module does the rest -- one persistent button per
  // block, as a direct child of the block rather than inside any cell's
  // output, so a cell re-run (which rebuilds the SVG) never rebuilds the
  // button with it. The opt-in class rather than "any block without a
  // Plotly chart" because OJS renders cells asynchronously: at load time a
  // Plotly page's block has no chart in it yet either.
  //
  // The button is pinned to the top-right corner of the *figure* -- the
  // union of the block's figure SVGs, measured rather than assumed -- not
  // of the block or the cell. A Plot.plot SVG with a fixed width sits
  // left-aligned in a wider column, and in fullscreen every figure is
  // letterboxed into the middle of the screen, so the cell's corner and the
  // picture's corner are not the same point. It is re-measured whenever
  // the block resizes, a figure SVG resizes or is replaced, or fullscreen
  // toggles.
  //
  // Fullscreen letterboxing is CSS (styles.css, `.ojs-svg-block:fullscreen`),
  // the same chain of fill-and-center wrappers the Plotly block uses; the
  // one thing CSS can't know is the picture's aspect ratio, so each figure
  // SVG is tagged `vm-fs-figure` and given its ratio as --vm-svg-aspect
  // here, from its viewBox or width/height attributes.

  const BLOCK_SELECTOR = ".ojs-chart-block.ojs-svg-block"
  const BUTTON_CLASS = "vm-fullscreen-toggle"
  const FIGURE_CLASS = "vm-fs-figure"
  const ASPECT_PROP = "--vm-svg-aspect"
  // An inline icon (a play button's glyph, a legend swatch) is never this
  // wide; a figure always is.
  const MIN_FIGURE_WIDTH = 64
  // How far inside the figure's corner the button sits, in px.
  const INSET = 6

  // The width/height ratio an <svg> draws at, from its attributes: the
  // viewBox when there is one (Observable Plot and hand-built SVGs alike
  // set it), else explicit width/height, else null for "measure it". Pure,
  // and exported so it can be unit-tested without a DOM.
  const svgAspectRatio = ({viewBox, width, height}) => {
    if (typeof viewBox === "string") {
      const parts = viewBox.trim().split(/[\s,]+/)
      if (parts.length === 4) {
        const w = parseFloat(parts[2])
        const h = parseFloat(parts[3])
        if (w > 0 && h > 0) return w / h
      }
    }
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (w > 0 && h > 0) return w / h
    return null
  }

  // The smallest box containing every given rect ({left, top, right,
  // bottom}); null for no rects. Pure, exported for the same reason.
  const figureBounds = (rects) => {
    let bounds = null
    for (const rect of rects) {
      if (bounds === null) {
        bounds = {left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom}
        continue
      }
      if (rect.left < bounds.left) bounds.left = rect.left
      if (rect.top < bounds.top) bounds.top = rect.top
      if (rect.right > bounds.right) bounds.right = rect.right
      if (rect.bottom > bounds.bottom) bounds.bottom = rect.bottom
    }
    return bounds
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, svgAspectRatio, figureBounds}}

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in head-scripts.html against a minimal `document` stub so the unit
  // tests can exercise the real functions above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return
  if (typeof document.createElement !== "function") return

  // The figure SVGs: every <svg> in the block's drawing cells that is wide
  // enough to be a picture. The controls bar is skipped outright (its play
  // buttons are SVG icons), as is anything inside a button or the legend.
  const findFigures = (block) => {
    const figures = []
    for (const svg of block.querySelectorAll("svg")) {
      if (svg.closest(".ojs-chart-controls, .ojs-legend-overlay, button")) continue
      if (svg.getBoundingClientRect().width < MIN_FIGURE_WIDTH) continue
      figures.push(svg)
    }
    return figures
  }

  const markFigure = (svg) => {
    if (svg.classList.contains(FIGURE_CLASS)) return
    svg.classList.add(FIGURE_CLASS)
    let ratio = svgAspectRatio({
      viewBox: svg.getAttribute("viewBox"),
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height")
    })
    if (ratio === null) {
      const rect = svg.getBoundingClientRect()
      if (rect.height > 0) ratio = rect.width / rect.height
    }
    if (ratio !== null) svg.style.setProperty(ASPECT_PROP, String(ratio))
  }

  const makeButton = (block) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = BUTTON_CLASS
    button.title = "Toggle fullscreen"
    button.setAttribute("aria-label", "Toggle fullscreen")
    // Same glyph as the Plotly modebar's button, taken from that module so
    // the two can't drift apart.
    const icon = globalThis.VM.plotting.fullscreenButton.icon
    button.innerHTML = `<svg viewBox="0 0 ${icon.width} ${icon.height}" width="16" height="16" aria-hidden="true"><path d="${icon.path}" fill="currentColor"/></svg>`
    button.addEventListener("click", () => {
      if (document.fullscreenElement === block) {
        document.exitFullscreen()
      } else {
        block.requestFullscreen()
      }
    })
    return button
  }

  const enhance = (block) => {
    if (block.querySelector(`:scope > .${BUTTON_CLASS}`)) return
    const button = makeButton(block)
    block.appendChild(button)

    let figureObserver = null
    const observed = new Set()

    const update = () => {
      if (!block.isConnected) {
        if (figureObserver) figureObserver.disconnect()
        document.removeEventListener("fullscreenchange", update)
        return
      }
      const figures = findFigures(block)
      // Stop watching SVGs a re-run has already thrown away.
      for (const svg of observed) {
        if (svg.isConnected) continue
        figureObserver.unobserve(svg)
        observed.delete(svg)
      }
      const rects = []
      for (const svg of figures) {
        markFigure(svg)
        rects.push(svg.getBoundingClientRect())
        // A re-run replaces the SVG; the observer has to follow it.
        if (figureObserver && !observed.has(svg)) {
          figureObserver.observe(svg)
          observed.add(svg)
        }
      }
      const bounds = figureBounds(rects)
      // Nothing drawn yet (the cell hasn't run): keep the button out of the
      // way rather than floating it over the bar.
      button.hidden = bounds === null
      if (bounds === null) return
      const blockRect = block.getBoundingClientRect()
      button.style.top = `${bounds.top - blockRect.top + INSET}px`
      button.style.right = `${blockRect.right - bounds.right + INSET}px`
    }

    if (typeof ResizeObserver !== "undefined") {
      figureObserver = new ResizeObserver(update)
      figureObserver.observe(block)
    }
    // Cell re-runs swap the SVG out; there is no resize to observe on a
    // node that was replaced wholesale.
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(update).observe(block, {childList: true, subtree: true})
    }
    document.addEventListener("fullscreenchange", update)
    update()
  }

  const enhanceAll = (root) => {
    const scope = root && root.querySelectorAll ? root : document
    for (const block of scope.querySelectorAll(BLOCK_SELECTOR)) enhance(block)
  }

  const start = () => {
    enhanceAll(document)
    if (typeof MutationObserver === "undefined" || !document.body) return
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches && node.matches(BLOCK_SELECTOR)) enhance(node)
          else enhanceAll(node)
        }
      }
    })
    observer.observe(document.body, {childList: true, subtree: true})
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start)
  } else {
    start()
  }
})(window)
