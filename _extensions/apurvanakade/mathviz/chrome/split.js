/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/*
 * Split layout: the measured half of split.css. From 992px up a page's
 * .vm-split > .vm-app is a fixed pane on the right, and three things about
 * it can't be written as CSS:
 *
 * - Its top follows the navbar's bottom edge. Quarto's headroom slides the
 *   navbar out of view on scroll down, and a pane pinned at the navbar's
 *   height would leave a gap where the navbar was. The edge is written to
 *   --vm-split-top every frame while the page scrolls -- only a custom
 *   property write, so it costs no layout of the page itself.
 * - Its charts fill the height the controls leave. Every .plotly-box-large
 *   in the pane gets an equal share, measured into --vm-split-chart-h once
 *   things settle (each refit redraws Plotly). The controls' height differs
 *   by page and by width, and OJS fills them in after load.
 * - The divider between the text and the pane can be dragged, or moved with
 *   the arrow keys, and the width is remembered in localStorage under the
 *   key a site names with `mathviz: {split: <key>}` ("vm-split-width" with
 *   `true`). Double-click or Home resets it and forgets it.
 *
 * Shipped, with split.css, only when a site sets `mathviz: {split: ...}`.
 * Loaded in <head>, so it waits for DOMContentLoaded; it does nothing on a
 * page with no .vm-split, or in embed mode (html.vm-embed), where the app is
 * the whole frame and embed.css sizes it.
 */
(function () {
  // Wider than the pane needs for a chart and its controls to stay legible,
  // and the text column keeps a readable measure.
  var MIN_APP = 480
  var MIN_TEXT = 320
  var KEY_STEP = 32

  /**
   * The pane width to use for a requested one: rounded, and clamped so the
   * pane is at least `minApp` wide and the text keeps `minText`. When the
   * window is too narrow for both, the pane gives way to the text's floor
   * only down to `minApp`.
   *
   * @param {number} requested - Pane width in px; non-finite returns null.
   * @param {number} viewport - The window's width in px.
   * @param {{minApp?: number, minText?: number}} [opts]
   * @returns {number|null}
   */
  function clampWidth(requested, viewport, opts) {
    var minApp = (opts && opts.minApp) || MIN_APP
    var minText = (opts && opts.minText) || MIN_TEXT
    if (!Number.isFinite(requested)) return null
    var max = Math.max(minApp, viewport - minText)
    return Math.round(Math.max(minApp, Math.min(max, requested)))
  }

  /**
   * The height each chart gets: what the pane's content box leaves after
   * everything that isn't a chart, shared equally.
   *
   * @param {{paneHeight: number, contentHeight: number, chartsHeight: number, charts: number}} m
   *   `paneHeight` is the pane's inner height (clientHeight less padding),
   *   `contentHeight` the extent of its visible children, `chartsHeight` the
   *   charts' current total.
   * @returns {number|null} Whole px, or null with no charts.
   */
  function chartHeight(m) {
    if (m.charts <= 0) return null
    var other = m.contentHeight - m.chartsHeight
    return Math.floor((m.paneHeight - other) / m.charts)
  }

  function readStored(key) {
    try {
      var value = localStorage.getItem(key)
      if (value === null) return null
      return Number(value)
    } catch (e) {
      return null
    }
  }

  function writeStored(key, value) {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, String(value))
    } catch (e) { /* storage unavailable */ }
  }

  function init() {
    if (document.documentElement.classList.contains("vm-embed")) return
    var app = document.querySelector(".vm-split > .vm-app")
    if (!app) return

    var keyMeta = document.querySelector('meta[name="mathviz:split-width-key"]')
    var WIDTH_KEY = keyMeta ? keyMeta.getAttribute("content") : "vm-split-width"
    var wide = window.matchMedia("(min-width: 992px)")

    function followNavbar() {
      var header = document.getElementById("quarto-header")
      var bottom = 0
      if (header) bottom = Math.max(0, header.getBoundingClientRect().bottom)
      document.documentElement.style.setProperty("--vm-split-top", bottom + "px")
    }

    function fitCharts() {
      if (!wide.matches) return
      var charts = app.querySelectorAll(".plotly-box-large")
      if (charts.length === 0) return
      var chartsHeight = 0
      for (var i = 0; i < charts.length; i++) chartsHeight += charts[i].getBoundingClientRect().height
      var style = getComputedStyle(app)
      var paneHeight = app.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      // The content's own extent, not scrollHeight: that never reports less
      // than the pane, so a chart that came out too short would never grow
      // back. Children with no box are skipped -- a hidden output: false
      // cell reports a zero rectangle at the viewport's origin.
      var top = Infinity
      var bottom = -Infinity
      for (var j = 0; j < app.children.length; j++) {
        var rect = app.children[j].getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue
        top = Math.min(top, rect.top)
        bottom = Math.max(bottom, rect.bottom)
      }
      if (!Number.isFinite(top)) return
      var height = chartHeight({ paneHeight: paneHeight, contentHeight: bottom - top, chartsHeight: chartsHeight, charts: charts.length })
      app.style.setProperty("--vm-split-chart-h", height + "px")
    }

    var fitTimer = null
    function scheduleFit() {
      clearTimeout(fitTimer)
      fitTimer = setTimeout(fitCharts, 150)
    }

    // The navbar slides for a few hundred ms after the last scroll event, so
    // the pane follows it frame by frame until then, and refits once it has
    // stopped (the pane's height changed with its top).
    var followUntil = 0
    function followFor(ms) {
      var running = performance.now() < followUntil
      followUntil = Math.max(followUntil, performance.now() + ms)
      if (running) return
      function frame() {
        followNavbar()
        if (performance.now() < followUntil) requestAnimationFrame(frame)
        else scheduleFit()
      }
      requestAnimationFrame(frame)
    }

    var handle = document.createElement("div")
    handle.className = "vm-split-handle"
    handle.tabIndex = 0
    handle.setAttribute("role", "separator")
    handle.setAttribute("aria-orientation", "vertical")
    handle.setAttribute("aria-label", "Resize the app pane")
    handle.title = "Drag to resize; double-click to reset"
    document.body.appendChild(handle)

    // A separator's value is the pane width in px, so its range is too
    // (the ARIA default is 0-100). Kept current for the stylesheet's
    // default width as well as a dragged one, and on window resize.
    handle.setAttribute("aria-valuemin", String(MIN_APP))
    function updateAria() {
      handle.setAttribute("aria-valuemax", String(Math.max(MIN_APP, window.innerWidth - MIN_TEXT)))
      handle.setAttribute("aria-valuenow", String(Math.round(app.getBoundingClientRect().width)))
    }

    // The reader's width, or null for the stylesheet's default.
    var appWidth = null
    function setAppWidth(px) {
      var width = clampWidth(px, window.innerWidth)
      if (width === null) return
      appWidth = width
      document.body.style.setProperty("--vm-split-app-w", width + "px")
      updateAria()
    }
    function resetAppWidth() {
      appWidth = null
      document.body.style.removeProperty("--vm-split-app-w")
      writeStored(WIDTH_KEY, null)
      updateAria()
      scheduleFit()
    }

    var stored = readStored(WIDTH_KEY)
    if (stored !== null) setAppWidth(stored)

    handle.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return
      e.preventDefault()
      handle.setPointerCapture(e.pointerId)
      handle.classList.add("vm-split-handle-active")
      document.body.classList.add("vm-split-dragging")
    })
    handle.addEventListener("pointermove", function (e) {
      if (!handle.hasPointerCapture(e.pointerId)) return
      setAppWidth(window.innerWidth - e.clientX)
    })
    function endDrag(e) {
      if (!handle.hasPointerCapture(e.pointerId)) return
      handle.releasePointerCapture(e.pointerId)
      handle.classList.remove("vm-split-handle-active")
      document.body.classList.remove("vm-split-dragging")
      if (appWidth !== null) writeStored(WIDTH_KEY, appWidth)
      scheduleFit()
    }
    handle.addEventListener("pointerup", endDrag)
    handle.addEventListener("pointercancel", endDrag)
    handle.addEventListener("dblclick", resetAppWidth)
    handle.addEventListener("keydown", function (e) {
      if (e.key === "Home") {
        e.preventDefault()
        resetAppWidth()
        return
      }
      var step = 0
      if (e.key === "ArrowLeft") step = KEY_STEP
      if (e.key === "ArrowRight") step = -KEY_STEP
      if (step === 0) return
      e.preventDefault()
      setAppWidth(app.getBoundingClientRect().width + step)
      if (appWidth !== null) writeStored(WIDTH_KEY, appWidth)
      scheduleFit()
    })

    followNavbar()
    updateAria()
    // OJS fills the controls in after load, so refit whenever the pane, the
    // panel or a slider bar changes size.
    var observer = new ResizeObserver(scheduleFit)
    observer.observe(app)
    var parts = app.querySelectorAll(".ojs-panel, .ojs-chart-controls")
    for (var k = 0; k < parts.length; k++) observer.observe(parts[k])
    window.addEventListener("scroll", function () { followFor(400) }, { passive: true })
    window.addEventListener("resize", function () {
      followNavbar()
      if (appWidth !== null) setAppWidth(appWidth)
      else updateAria()
      scheduleFit()
    })
    scheduleFit()
  }

  var VM = globalThis.VM || (globalThis.VM = {})
  VM.chrome = { ...VM.chrome, split: { clampWidth: clampWidth, chartHeight: chartHeight } }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
