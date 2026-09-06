/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Gives every slider a play/pause button that sweeps it end to end, so the
  // animation a page is really about -- Newton's iterates, an ODE solution
  // refining as n grows, a point tracing a parametric curve, a filter's alpha
  // sliding from "trust the model" to "trust the measurement" -- is one click
  // rather than a manual drag.
  //
  // Playback is *rate*-based, not step-based: a sweep lasts a wall-clock
  // duration and each animation frame asks where the thumb should be by now.
  // The older design ticked a fixed setInterval and advanced a fixed number of
  // slider steps, which meant every page had to hand-tune that number to its
  // own step grid (a t slider divided into 500 steps needed "5" where an
  // n slider of 20 needed "1"), and exposed the tuning as a text box the
  // reader had to type into. Duration-based pacing derives all of that from
  // the slider's own min/max/step, so there is nothing per-page left to say
  // and the speed control can be a plain set of presets on the button itself.
  //
  // Delegated and self-installing: these sliders are created at runtime by
  // Observable Inputs and are destroyed and rebuilt whenever an upstream field
  // changes (see the viewof-recreation note in js/ui/apply-example.js), so
  // there is no one moment at which they all exist to be wired up.

  // ── Pure playback arithmetic ──────────────────────────────────────
  // Exported so it can be unit-tested without a DOM.

  const MIN_SWEEP_MS = 2000
  const MAX_SWEEP_MS = 10000
  // Roughly how long one distinct value should be on screen at x1, before the
  // clamp above takes over. Chosen to land a typical ~20-stop iteration slider
  // near the 250ms/step the fixed-interval version used, so a familiar page
  // keeps its familiar pace.
  const MS_PER_STOP = 350

  // How many distinct values the slider can take. Used both for the sweep
  // duration and for the chart tween below.
  const stopCount = ({min, max, step}) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return 0
    const span = max - min
    if (!(span > 0)) return 0
    let increment = step
    // A slider with step="any" (or none) has no grid of its own; a hundred
    // stops is smooth enough to read as continuous at any sweep length.
    if (!Number.isFinite(increment) || increment <= 0) increment = span / 100
    const stops = Math.round(span / increment)
    if (!Number.isFinite(stops) || stops < 1) return 0
    return stops
  }

  // Total time for one end-to-end sweep, in ms. Zero means "this slider can't
  // be swept" (a degenerate range -- e.g. a "Max" of 1 leaves a [0, 0]
  // slider), and the caller stops rather than spinning a timer that can never
  // move.
  const playbackDuration = ({min, max, step, speed}) => {
    const stops = stopCount({min, max, step})
    if (stops === 0) return 0
    let rate = speed
    if (!Number.isFinite(rate) || rate <= 0) rate = 1
    let duration = stops * MS_PER_STOP
    if (duration < MIN_SWEEP_MS) duration = MIN_SWEEP_MS
    if (duration > MAX_SWEEP_MS) duration = MAX_SWEEP_MS
    return duration / rate
  }

  // Where the thumb should be after `elapsed` ms of a sweep that began at
  // fraction `start` of the track. Returns the value snapped to the slider's
  // own step grid, the direction it is currently travelling (for a bounce),
  // and whether the sweep is finished.
  const playbackFrame = ({min, max, step, elapsed, duration, mode, start}) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return {value: min, direction: 1, done: true}
    }
    const span = max - min
    if (!(span > 0) || !Number.isFinite(duration) || duration <= 0) {
      return {value: min, direction: 1, done: true}
    }
    let increment = step
    if (!Number.isFinite(increment) || increment <= 0) increment = span / 100

    let from = start
    if (!Number.isFinite(from)) from = 0
    let progress = from + (Number.isFinite(elapsed) ? elapsed : 0) / duration

    let position
    let direction = 1
    let done = false
    if (mode === "loop") {
      position = progress - Math.floor(progress)
    } else if (mode === "bounce") {
      // A triangle wave: the first unit of progress runs up the track, the
      // next runs back down, and so on forever.
      const cycle = progress - 2 * Math.floor(progress / 2)
      if (cycle <= 1) {
        position = cycle
      } else {
        position = 2 - cycle
        direction = -1
      }
    } else {
      position = progress
      if (position >= 1) {
        position = 1
        done = true
      }
    }
    if (position < 0) position = 0

    // Snapped by counting whole steps from `min` rather than by accumulating:
    // repeatedly adding 0.01 drifts off the grid the slider's own number
    // readout snaps to, and the drift compounds over a long sweep.
    const index = Math.round((min + position * span - min) / increment)
    let value = min + index * increment
    // 0.1 + 0.2 lands on 0.30000000000000004, which the readout would show in
    // full. Twelve digits is far more precision than any slider on the site
    // has, so this only ever trims float noise.
    value = Number(value.toPrecision(12))
    if (value > max) value = max
    if (value < min) value = min
    return {value, direction, done}
  }

  globalThis.VM = {
    ...globalThis.VM,
    ui: {...globalThis.VM?.ui, playbackDuration, playbackFrame, playbackTweenMs: 0}
  }

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in head-scripts.html against a minimal `document` stub so the unit
  // tests can exercise the real functions above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return
  if (typeof document.createElement !== "function") return

  // ── Chrome ────────────────────────────────────────────────────────

  // Every slider that lives in a controls panel or a chart-overlay bar, which
  // between them is every slider on the site. An individual one opts out with
  // data-vm-play="off" on itself or any ancestor.
  // The speed/mode popover needs the native popover API, and degrades to
  // "no popover at all" without it rather than to something broken. Without
  // support the [popover] attribute is inert, so the panel would have no UA
  // `display: none` to hide it while closed and would sit on the page
  // permanently -- and `matches(":popover-open")` throws a DOMException on a
  // pseudo-class the browser doesn't know, rather than returning false. The
  // play button itself needs none of this and still works; the reader just
  // gets the stored (or default) speed and mode.
  const SUPPORTS_POPOVER = typeof HTMLElement !== "undefined" &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover")

  const SLIDER_SELECTOR = '.ojs-panel input[type="range"], .ojs-chart-controls input[type="range"]'
  const OPT_OUT_SELECTOR = '[data-vm-play="off"]'

  // Bootstrap Icons (MIT) -- same source as the grip in
  // js/ui/draggable-overlay.js and the fullscreen button.
  const PLAY_PATHS = ["M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"]
  const PAUSE_PATHS = ["M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"]
  const REPLAY_PATHS = [
    "M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z",
    "M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"
  ]
  const CARET_PATHS = ["M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"]

  const icon = (paths, size) => {
    let out = `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false">`
    for (const path of paths) out += `<path fill="currentColor" d="${path}"></path>`
    return `${out}</svg>`
  }

  const SPEEDS = [0.25, 0.5, 1, 2, 4]
  const SPEED_LABELS = {0.25: "¼×", 0.5: "½×", 1: "1×", 2: "2×", 4: "4×"}
  const MODES = [["once", "Once"], ["loop", "Loop"], ["bounce", "Bounce"]]

  // How the reader likes to watch a sweep is a viewing preference, not part of
  // the computation a shared link reproduces -- so it lives in localStorage
  // site-wide (like the sidebar's pin state) rather than in the URL, which is
  // where every input that *does* affect the math goes.
  const STORAGE_KEY = "vm-playback"

  const settings = {speed: 1, mode: "once"}

  const readSettings = () => {
    let raw = null
    // Private windows and "block site data" make localStorage itself throw.
    try {
      raw = window.localStorage.getItem(STORAGE_KEY)
    } catch (err) {
      return
    }
    if (!raw) return
    let stored = null
    try {
      stored = JSON.parse(raw)
    } catch (err) {
      return
    }
    if (!stored || typeof stored !== "object") return
    if (SPEEDS.includes(stored.speed)) settings.speed = stored.speed
    for (const [value] of MODES) {
      if (stored.mode === value) settings.mode = value
    }
  }

  const writeSettings = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (err) {
      // Nothing to do -- the setting still applies for this page view.
    }
  }

  readSettings()

  let panelSeq = 0

  // One entry per enhanced slider: {anchor, close, refresh}. Observable Inputs
  // recreates these views wholesale on every upstream change, so entries have
  // to be dropped as their sliders are replaced -- otherwise this grows for
  // the life of the page, and (since a popover is mounted on <body>, not
  // inside the control) an open panel whose slider just vanished would be
  // left floating with nothing behind it.
  const controls = new Set()

  const prune = () => {
    for (const entry of controls) {
      if (entry.anchor.isConnected) continue
      entry.close()
      controls.delete(entry)
    }
  }

  // Every panel on the page repaints its pressed states from the shared
  // settings, so changing the speed on one slider is visibly the same choice
  // on the next one the reader opens.
  const refreshPanels = () => {
    for (const entry of controls) entry.refresh()
  }

  // ── Playback ──────────────────────────────────────────────────────

  // At most one sweep runs per page: two at once would interleave their
  // updates through the same reactive graph, and on a chart page each update
  // costs a full Plotly react.
  let active = null

  const stopActive = () => {
    if (active) active.stop()
  }

  // Charts are tweened by Plotly using VM.plotting.layout()'s `transition`,
  // which is a flat 300ms. During a sweep that is longer than the gap between
  // two values, so every tween is cut off by the next one and the chart reads
  // as lagging rather than animating. Publishing the gap here lets the shared
  // layout tween for exactly as long as it has -- read at call time, so the
  // load order of these two files doesn't matter.
  const setTween = (durationMs, stops) => {
    let tween = 0
    if (durationMs > 0 && stops > 0) {
      // Slightly short of the real gap, so each tween settles just before the
      // next value arrives instead of being interrupted by it.
      tween = (durationMs / stops) * 0.9
      if (tween > 300) tween = 300
    }
    globalThis.VM.ui.playbackTweenMs = tween
  }

  const numberOr = (text, fallback) => {
    const value = Number(text)
    if (text === "" || text === null || text === undefined) return fallback
    if (!Number.isFinite(value)) return fallback
    return value
  }

  const bounds = (input) => {
    const min = numberOr(input.min, 0)
    const max = numberOr(input.max, 100)
    const step = numberOr(input.step, NaN)
    return {min, max, step}
  }

  const enhance = (input) => {
    if (input.dataset.vmPlayReady === "1") return
    if (input.closest(OPT_OUT_SELECTOR)) return
    const form = input.closest("form")
    if (!form) return
    input.dataset.vmPlayReady = "1"

    const wrap = document.createElement("span")
    wrap.className = "vm-play"

    const button = document.createElement("button")
    button.type = "button"
    button.className = "vm-play-button"

    const more = document.createElement("button")
    more.type = "button"
    more.className = "vm-play-more"
    more.innerHTML = icon(CARET_PATHS, 9)
    more.setAttribute("aria-haspopup", "true")
    more.setAttribute("aria-expanded", "false")
    more.setAttribute("aria-label", "Playback speed and mode")
    more.title = "Playback speed and mode"

    const panel = document.createElement("div")
    panel.className = "vm-play-panel"
    // The native popover API, for one specific reason: a top-layer element is
    // not clipped by ANY ancestor. Quarto wraps every OJS cell output in
    // `.cell-output-display`, which it gives `overflow: auto` so wide output
    // scrolls -- that makes it a scroll container, and a scroll container
    // clips descendants that escape its box. This panel opens well above its
    // own ~37px-tall cell, so nested-and-absolutely-positioned it was clipped
    // away almost entirely (what showed was the sliver still inside the
    // cell's box). Nothing about z-index or stacking order fixes that; only
    // leaving the clip behind does. The top layer also makes it immune to the
    // same trap from `overflow`, `transform`, `filter` or `contain` on any
    // future wrapper, which is why this is preferred over re-parenting the
    // panel to <body> by hand.
    if (SUPPORTS_POPOVER) {
      panel.setAttribute("popover", "auto")
      panelSeq += 1
      panel.id = `vm-play-panel-${panelSeq}`
      // Letting the button drive the popover declaratively hands the browser
      // toggling AND light dismiss (click-outside, Escape, closing whichever
      // other popover was open) -- all of which this file used to hand-roll.
      more.setAttribute("popovertarget", panel.id)
    }

    // Deliberately NOT appended to `wrap`: the popover is mounted at the top
    // level when opened (see openPanel). A .ojs-chart-controls bar carries
    // backdrop-filter, and a backdrop-filtered element becomes its own render
    // surface that CLIPS descendants to its own bounds -- an absolutely
    // positioned child extending above the bar is simply not painted, so the
    // popover was invisible apart from the sliver overlapping the bar itself.
    if (SUPPORTS_POPOVER) wrap.append(button, more, panel)
    else wrap.append(button)

    // "idle" | "playing" | "done" -- `done` is a finished once-mode sweep,
    // which shows a replay glyph so a stopped animation says why it stopped
    // rather than looking indistinguishable from one never started.
    let state = "idle"
    let frame = null
    let startedAt = 0
    let startFraction = 0
    let duration = 0
    let stops = 0

    const setButtonState = () => {
      let paths = PLAY_PATHS
      let label = "Play"
      if (state === "playing") {
        paths = PAUSE_PATHS
        label = "Pause"
      } else if (state === "done") {
        paths = REPLAY_PATHS
        label = "Replay"
      }
      button.innerHTML = icon(paths, 14)
      button.setAttribute("aria-pressed", state === "playing" ? "true" : "false")
      button.setAttribute("aria-label", label)
      button.title = label
      button.classList.toggle("vm-playing", state === "playing")
    }

    const stop = (nextState) => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      if (active === controller) {
        active = null
        setTween(0, 0)
      }
      state = nextState || "idle"
      setButtonState()
    }

    const controller = {stop}

    // Setting the value and dispatching a real "input" event on the range
    // input is what a drag does: Observable Inputs' own handler updates the
    // form's value and re-dispatches on the form, so OJS reacts identically,
    // and js/ui/range-progress.js repaints the track fill off the same event.
    const setValue = (value) => {
      if (Number(input.value) === value) return
      input.value = String(value)
      input.dispatchEvent(new Event("input", {bubbles: true}))
    }

    // Re-anchors an in-flight sweep to wherever the thumb is now, so a speed
    // change mid-sweep changes the pace without teleporting the thumb.
    const rebase = () => {
      const {min, max, step} = bounds(input)
      duration = playbackDuration({min, max, step, speed: settings.speed})
      stops = stopCount({min, max, step})
      const span = max - min
      startFraction = 0
      if (span > 0) startFraction = (Number(input.value) - min) / span
      if (!Number.isFinite(startFraction) || startFraction < 0) startFraction = 0
      if (startFraction >= 1) startFraction = 0
      startedAt = performance.now()
      setTween(duration, stops)
    }

    const tick = () => {
      frame = null
      // A cell re-run replaces this slider wholesale; the detached node would
      // still animate happily, driving nothing. Same self-teardown idiom as
      // VM.plotting.autoResize and the drag observers.
      if (!input.isConnected) {
        stop("idle")
        return
      }
      const {min, max, step} = bounds(input)
      const result = playbackFrame({
        min,
        max,
        step,
        elapsed: performance.now() - startedAt,
        duration,
        mode: settings.mode,
        start: startFraction
      })
      setValue(result.value)
      if (result.done) {
        stop("done")
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      stopActive()
      const {min, max, step} = bounds(input)
      if (playbackDuration({min, max, step, speed: settings.speed}) === 0) return
      // A finished once-mode sweep restarts from the beginning, so pressing
      // replay means what it says.
      if (state === "done" || Number(input.value) >= max) setValue(min)
      active = controller
      rebase()
      state = "playing"
      setButtonState()
      frame = requestAnimationFrame(tick)
    }

    button.addEventListener("click", () => {
      if (state === "playing") stop("idle")
      else start()
    })

    // ── Speed / mode popover ──
    const pills = []

    const addGroup = (title, entries, isCurrent, onPick) => {
      const heading = document.createElement("div")
      heading.className = "vm-play-group"
      heading.textContent = title
      const row = document.createElement("div")
      row.className = "vm-play-pills"
      for (const [value, label] of entries) {
        const pill = document.createElement("button")
        pill.type = "button"
        pill.className = "vm-play-pill"
        pill.textContent = label
        pill.addEventListener("click", () => {
          onPick(value)
          writeSettings()
          refreshPanels()
          if (state === "playing") rebase()
        })
        pills.push({pill, isCurrent: () => isCurrent(value)})
        row.append(pill)
      }
      panel.append(heading, row)
    }

    const speedEntries = []
    for (const speed of SPEEDS) speedEntries.push([speed, SPEED_LABELS[speed]])
    addGroup("Speed", speedEntries, (value) => settings.speed === value, (value) => {
      settings.speed = value
    })
    addGroup("Mode", MODES, (value) => settings.mode === value, (value) => {
      settings.mode = value
      // Leaving a finished once-sweep on "replay" after switching to Loop
      // would misdescribe what the button now does.
      if (state === "done") {
        state = "idle"
        setButtonState()
      }
    })

    const refresh = () => {
      for (const {pill, isCurrent} of pills) {
        const on = isCurrent()
        pill.classList.toggle("vm-play-pill-on", on)
        pill.setAttribute("aria-pressed", on ? "true" : "false")
      }
    }
    refresh()

    let reposition = null

    // The lowest y the popover may occupy. Quarto's navbar is fixed, so a
    // panel that merely clears the viewport's top edge can still open
    // underneath it -- which looks exactly like being cut in half.
    const topLimit = () => {
      let limit = 8
      const header = document.querySelector("#quarto-header, .navbar.fixed-top, header.fixed-top")
      if (!header) return limit
      const style = getComputedStyle(header)
      if (style.position !== "fixed" && style.position !== "sticky") return limit
      const box = header.getBoundingClientRect()
      if (box.bottom > limit) limit = box.bottom + 4
      return limit
    }

    // Positioned from script because CSS anchor positioning
    // (anchor-name/position-anchor, which is what this would otherwise be) is
    // not available across browsers yet. Coordinates come from the caret's
    // own viewport rect, which is what a top-layer `position: fixed` element
    // is placed against -- inside a fullscreened chart too.
    const place = () => {
      if (!more.isConnected) return
      const anchor = more.getBoundingClientRect()
      const box = panel.getBoundingClientRect()
      const gap = 6
      // Prefer opening upward -- these bars sit at a chart's bottom edge, so
      // that is usually where the room is -- and flip below when it isn't.
      let top = anchor.top - box.height - gap
      if (top < topLimit()) top = anchor.bottom + gap
      let left = anchor.left
      const maxLeft = window.innerWidth - box.width - 8
      if (left > maxLeft) left = maxLeft
      if (left < 8) left = 8
      panel.style.top = `${top}px`
      panel.style.left = `${left}px`
    }

    // Guarded on support, not just wrapped in try/catch: matches() throws a
    // DOMException for a pseudo-class the browser doesn't recognise.
    const closePanel = () => {
      if (!SUPPORTS_POPOVER) return
      if (panel.matches(":popover-open")) panel.hidePopover()
    }

    // Everything the popover needs is driven off this one event, which fires
    // for a browser-initiated light dismiss exactly as it does for a click on
    // the button -- so there is no path that opens or closes the panel
    // without this running.
    panel.addEventListener("toggle", (event) => {
      const open = event.newState === "open"
      more.setAttribute("aria-expanded", open ? "true" : "false")
      if (open) {
        refresh()
        place()
        reposition = () => place()
        // Capture phase, so this also sees scrolling inside any scrollable
        // ancestor rather than only the document.
        window.addEventListener("scroll", reposition, true)
        window.addEventListener("resize", reposition)
        return
      }
      if (!reposition) return
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
      reposition = null
    })

    // Taking hold of the slider is a clear "I'll drive" -- keep sweeping and
    // the two would fight over the value. Our own updates go through
    // dispatchEvent and trigger neither of these.
    input.addEventListener("pointerdown", () => stop("idle"))
    input.addEventListener("keydown", () => stop("idle"))

    setButtonState()
    // Inserted before whichever form-level element holds the range input, so
    // this works whether Observable Inputs puts the range and its number
    // readout directly in the form or inside a wrapper div. styles.css turns
    // .vm-has-play into a wrapping flex row and lets the element after the
    // button grow, rather than depending on that structure either.
    let anchor = input
    while (anchor.parentElement !== form && anchor.parentElement) anchor = anchor.parentElement
    form.insertBefore(wrap, anchor)
    form.classList.add("vm-has-play")
  }

  const enhanceAll = () => {
    prune()
    for (const input of document.querySelectorAll(SLIDER_SELECTOR)) enhance(input)
  }

  const start = () => {
    enhanceAll()

    // A sweep left running in a background tab keeps re-rendering a chart
    // nobody is looking at.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") stopActive()
    })

    if (typeof MutationObserver === "undefined" || !document.body) return
    // Coalesced into one sweep per frame: OJS settling a cell fires a burst of
    // mutations, and re-querying per record would run the same (already
    // guarded) scan dozens of times for one new slider.
    let pending = false
    const observer = new MutationObserver(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        enhanceAll()
      })
    })
    observer.observe(document.body, {childList: true, subtree: true})
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start)
  } else {
    start()
  }
})(globalThis);
