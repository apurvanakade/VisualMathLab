/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Gives a slider a play/pause button that sweeps it from end to end, so the
  // animation a page is really about -- Newton's iterates, an ODE solution
  // refining as n grows, a point tracing a parametric curve -- is one click
  // rather than a manual drag.
  //
  // Opt-in, unlike js/ui/range-progress.js and js/ui/draggable-overlay.js
  // which enhance every slider/panel they find: sweeping a parameter only
  // tells a story on some of them. A page opts a slider in by tagging it
  // `slider.dataset.vmPlay = ""`, the same idiom as dataset.exampleField.
  //
  // Delegated and self-installing all the same, because these sliders are
  // created at runtime by Observable Inputs and are destroyed and rebuilt
  // whenever an upstream field changes (see the viewof-recreation note in
  // js/ui/apply-example.js) -- there is no one moment at which they all exist
  // to be wired up.

  // How many slider steps one tick advances comes from a page-level text box
  // tagged data-vm-play-step, so the reader controls the speed. Pure and
  // exported so the arithmetic can be unit-tested without a DOM.
  //
  // Returns null when the sweep is over, which is also what happens for a
  // degenerate range (a "Max" of 1 leaves a [0, 0] slider) -- the caller
  // stops rather than spinning a timer that can never move.
  const playbackNextValue = ({value, min, max, step, stepSize}) => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return null
    let increment = step
    if (!Number.isFinite(increment) || increment <= 0) increment = 1
    let count = Math.round(stepSize)
    if (!Number.isFinite(count) || count < 1) count = 1
    if (value >= max) return null

    // Counted in whole steps from `min` rather than added to the running
    // value: repeatedly adding 0.01 drifts off the grid the slider's own
    // number readout snaps to, and the drift compounds over a long sweep.
    const index = Math.round((value - min) / increment)
    let next = min + (index + count) * increment
    // 0.1 + 0.2 lands on 0.30000000000000004, which the readout would show in
    // full. Twelve digits is far more precision than any slider on the site
    // has, so this only ever trims float noise.
    next = Number(next.toPrecision(12))
    if (next > max) next = max
    if (next <= value) return null
    return next
  }

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, playbackNextValue}}

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in head-scripts.html against a minimal `document` stub so the unit
  // tests can exercise the real function above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return
  if (typeof document.createElement !== "function") return

  // Tagged on the view Inputs.range returns -- which is the <form>, not the
  // <input> inside it -- so a page opts in exactly the way it already tags
  // dataset.exampleField, without reaching into Observable's internals.
  const SLIDER_SELECTOR = '[data-vm-play]'
  const STEP_FIELD_SELECTOR = '[data-vm-play-step]'

  // Fixed cadence; the step-size box is what makes a sweep faster or slower.
  // Comfortably clear of the ~40ms OJS takes to settle a reactive update
  // (measured, see js/ui/apply-example.js), and slow enough that a reader can
  // actually follow an iteration counter.
  const TICK_MS = 250

  // Bootstrap Icons' "play-fill" and "pause-fill" (MIT) -- same source as the
  // grip in js/ui/draggable-overlay.js and the fullscreen button.
  const PLAY_PATH = "M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"
  const PAUSE_PATH = "M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"

  // At most one sweep runs per page: two at once would interleave their
  // updates through the same reactive graph, and on a chart page each tick
  // costs a full Plotly react.
  let active = null

  const stopActive = () => {
    if (active) active.stop()
  }

  const icon = (path) => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"></path></svg>`

  const numberOr = (text, fallback) => {
    const value = Number(text)
    if (text === "" || text === null || text === undefined) return fallback
    if (!Number.isFinite(value)) return fallback
    return value
  }

  // Looked up fresh on every tick rather than captured once: the box is an
  // Observable Inputs view like any other, so it can be recreated underneath
  // us, and holding a reference to it is the reactive-loop hazard described in
  // js/ui/apply-example.js. Parsed with VM.expressions.makeNumber so it
  // accepts "2*3" like every other numeric field on the site.
  const readStepSize = () => {
    const field = document.querySelector(STEP_FIELD_SELECTOR)
    if (!field) return 1
    const text = field.value
    const math = window.math
    const VM = window.VM
    if (!math || !VM || !VM.expressions) return numberOr(text, 1)
    const parsed = VM.expressions.makeNumber(math, text)
    if (parsed === null || !Number.isFinite(parsed)) return 1
    return Math.max(1, Math.round(parsed))
  }

  const enhance = (view) => {
    if (view.dataset.vmPlayReady === "1") return
    const input = view.querySelector('input[type="range"]')
    if (!input) return
    const form = input.closest("form")
    if (!form) return
    view.dataset.vmPlayReady = "1"

    const button = document.createElement("button")
    button.type = "button"
    button.className = "vm-play-button"
    let timer = null

    const setButtonState = (playing) => {
      button.innerHTML = playing ? icon(PAUSE_PATH) : icon(PLAY_PATH)
      button.setAttribute("aria-pressed", playing ? "true" : "false")
      button.setAttribute("aria-label", playing ? "Pause" : "Play")
      button.title = playing ? "Pause" : "Play"
      button.classList.toggle("vm-playing", playing)
    }

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      if (active === controller) active = null
      setButtonState(false)
    }

    const controller = {stop}

    // Setting the value and dispatching a real "input" event on the range
    // input is what a drag does: Observable Inputs' own handler updates the
    // form's value and re-dispatches on the form, so OJS reacts identically,
    // and js/ui/range-progress.js repaints the track fill off the same event.
    const setValue = (value) => {
      input.value = String(value)
      input.dispatchEvent(new Event("input", {bubbles: true}))
    }

    const tick = () => {
      // A cell re-run replaces this slider wholesale; the detached node would
      // still tick happily, driving nothing. Same self-teardown idiom as
      // VM.plotting.autoResize and the drag observers.
      if (!input.isConnected) {
        stop()
        return
      }
      const next = playbackNextValue({
        value: Number(input.value),
        min: numberOr(input.min, 0),
        max: numberOr(input.max, 100),
        step: numberOr(input.step, 1),
        stepSize: readStepSize()
      })
      if (next === null) {
        stop()
        return
      }
      setValue(next)
    }

    const start = () => {
      stopActive()
      const min = numberOr(input.min, 0)
      const max = numberOr(input.max, 100)
      // Playback halts at the top rather than looping, so pressing play on a
      // finished sweep means "run it again from the start".
      if (Number(input.value) >= max) setValue(min)
      active = controller
      setButtonState(true)
      timer = setInterval(tick, TICK_MS)
    }

    button.addEventListener("click", () => {
      if (timer === null) start()
      else stop()
    })

    // Taking hold of the slider is a clear "I'll drive" -- keep sweeping and
    // the two would fight over the value. Our own updates go through
    // dispatchEvent and trigger neither of these.
    input.addEventListener("pointerdown", stop)
    input.addEventListener("keydown", stop)

    setButtonState(false)
    // Inserted before whichever form-level element holds the range input, so
    // this works whether Observable Inputs puts the range and its number
    // readout directly in the form or inside a wrapper div. styles.css turns
    // .vm-has-play into a wrapping flex row and lets the element after the
    // button grow, rather than depending on that structure either.
    let anchor = input
    while (anchor.parentElement !== form && anchor.parentElement) anchor = anchor.parentElement
    form.insertBefore(button, anchor)
    form.classList.add("vm-has-play")
  }

  const enhanceAll = (root) => {
    const scope = root && root.querySelectorAll ? root : document
    for (const view of scope.querySelectorAll(SLIDER_SELECTOR)) enhance(view)
  }

  const start = () => {
    enhanceAll(document)

    // A sweep left running in a background tab keeps re-rendering a chart
    // nobody is looking at.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") stopActive()
    })

    if (typeof MutationObserver === "undefined" || !document.body) return
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches && node.matches(SLIDER_SELECTOR)) enhance(node)
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
})(globalThis);
