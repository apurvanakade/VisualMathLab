/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Keeps every range slider's --sx custom property in sync with its value,
// as a percentage. styles.css paints the filled part of the track with a
// gradient sized by --sx: Firefox has ::-moz-range-progress and fills the
// track natively, but WebKit/Blink have no equivalent, so the fill there
// has to be drawn on ::-webkit-slider-runnable-track and therefore has to
// be told how far along the thumb is.
//
// One delegated listener on the document rather than a listener per slider:
// the pages' sliders are created at runtime by Observable Inputs (and are
// recreated whenever a reactive upstream field changes -- see the
// viewof-recreation note in js/ui/apply-example.js), so there is no single
// moment at which they all exist to be wired up individually.
(function attachRangeProgress() {
  // This file is pure DOM side effects -- no VM.* export -- but it is still
  // loaded by scripts/load-vm.mjs, which runs every script listed in
  // head-scripts.html against a minimal `document` stub. Bail out unless a
  // real DOM is present, so the unit tests (and any other non-browser
  // consumer) can load it harmlessly.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return

  const setProgress = (input) => {
    const min = Number(input.min === "" ? 0 : input.min)
    const max = Number(input.max === "" ? 100 : input.max)
    const value = Number(input.value)
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(value)) return
    const span = max - min
    let fraction = 0
    if (span > 0) fraction = (value - min) / span
    if (fraction < 0) fraction = 0
    if (fraction > 1) fraction = 1
    input.style.setProperty("--sx", `${fraction * 100}%`)
  }

  const refreshAll = (root) => {
    const scope = root && root.querySelectorAll ? root : document
    for (const input of scope.querySelectorAll('input[type="range"]')) setProgress(input)
  }

  // "input" fires while dragging; "change" covers a programmatic set that
  // dispatches change only (applyExampleParams dispatches "input", but a
  // native <select>-driven flow can land on either).
  for (const eventName of ["input", "change"]) {
    document.addEventListener(eventName, (event) => {
      const target = event.target
      if (target && target.matches && target.matches('input[type="range"]')) setProgress(target)
    }, true)
  }

  // Sliders appear (and are replaced wholesale) long after load as OJS
  // cells settle, so watch for them rather than sweeping once.
  const observeNewSliders = () => {
    refreshAll(document)
    if (typeof MutationObserver === "undefined" || !document.body) return
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches && node.matches('input[type="range"]')) setProgress(node)
          else refreshAll(node)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeNewSliders)
  } else {
    observeNewSliders()
  }
})()
