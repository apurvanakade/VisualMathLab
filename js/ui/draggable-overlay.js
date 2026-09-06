/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Lets the reader drag the trace legend (js/ui/legend-overlay.js) off
  // whatever part of the curve it happens to be covering. It is pinned to a
  // fixed corner by styles.css, which is the right default but is sometimes
  // exactly where the interesting part of the plot is.
  //
  // The legend is the only draggable panel. The step/parameter bar
  // (.ojs-step-overlay) used to float over the chart's bottom edge and be
  // draggable for the same reason, but it now sits in normal flow beneath the
  // chart and covers nothing, so there is nowhere to drag it to. Leaving it
  // out of PANEL_SELECTOR is also what keeps a *stored* offset from a version
  // that did float it from shoving the in-flow bar out of place: the only
  // thing that ever writes `transform` here is this module, so a bar it never
  // touches simply renders where the stylesheet puts it, and the stale
  // localStorage entry is inert rather than actively wrong.
  //
  // Delegated, like js/ui/range-progress.js: the legend carries a stable
  // class name that every chart page already emits, so this wires itself up
  // with no per-page edit. Watching for panels that appear later is not
  // optional either -- the legend element is destroyed and rebuilt on every
  // dark-mode toggle (a page's `viewof traces` cell reads traceColors, which
  // reads chartColors, which depends on vmTheme), so a one-time sweep would
  // leave the rebuilt legend undraggable and back in its corner.
  //
  // Dragging is deliberately restricted to the grip: the panel is made almost
  // entirely of controls (the legend rows are clickable toggles), and a
  // drag-anywhere surface would keep stealing those interactions.

  const KEY_PREFIX = "vml-overlay-pos"
  const PANEL_SELECTOR = ".ojs-legend-overlay"
  const CONTAINER_SELECTOR = ".ojs-plot-overlay"

  const clampValue = (value, min, max) => {
    // A panel bigger than the chart it floats on has no valid range at all
    // (max lands below min); pin it to the container's near edge rather than
    // letting the two bounds cross and yield a nonsense offset.
    if (max < min) return min
    if (value < min) return min
    if (value > max) return max
    return value
  }

  // How far the panel may be moved from its CSS anchor before any part of it
  // would leave the chart. Pure, and exported so the bounds arithmetic can be
  // unit-tested without a DOM.
  //
  // offsetLeft/offsetTop are the panel's *layout* position inside the
  // container. Transforms don't affect layout, so those stay a fixed
  // reference to measure from no matter what translate is currently applied
  // -- which is what lets this be re-run at any time without drift.
  const clampOverlayOffset = ({dx, dy, offsetLeft, offsetTop, width, height, containerWidth, containerHeight}) => {
    return {
      dx: clampValue(dx, -offsetLeft, containerWidth - offsetLeft - width),
      dy: clampValue(dy, -offsetTop, containerHeight - offsetTop - height)
    }
  }

  // One key per panel per chart per page. The vml- prefix matches the site's
  // other stored values (vml-sidebar-pinned, vml-analytics-consent).
  const overlayStorageKey = (pathname, role, index) => `${KEY_PREFIX}:${pathname}:${role}:${index}`

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, clampOverlayOffset, overlayStorageKey}}

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in head-scripts.html against a minimal `document` stub so the unit
  // tests can exercise the real functions above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return
  if (typeof document.createElement !== "function") return

  // Bootstrap Icons' "grip-vertical" (MIT) -- same source as the fullscreen
  // modebar button's icon in js/plotting/plotly-fullscreen-button.js.
  const GRIP_PATH = "M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"

  const readStored = (key) => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || !Number.isFinite(parsed.dx) || !Number.isFinite(parsed.dy)) return null
      return {dx: parsed.dx, dy: parsed.dy}
    } catch (e) {
      // Storage blocked, or a value someone else wrote that isn't ours.
      return null
    }
  }

  const writeStored = (key, offset) => {
    try {
      localStorage.setItem(key, JSON.stringify(offset))
    } catch (e) {
      /* Private browsing with storage blocked: dragging still works, it just
         won't be remembered. */
    }
  }

  const clearStored = (key) => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      /* Nothing readable means nothing to clear. */
    }
  }

  const containerIndex = (container) => {
    const all = document.querySelectorAll(CONTAINER_SELECTOR)
    for (let i = 0; i < all.length; i++) {
      if (all[i] === container) return i
    }
    return 0
  }

  const enhance = (panel) => {
    if (panel.dataset.vmDraggable === "1") return
    const container = panel.closest(CONTAINER_SELECTOR)
    if (!container) return
    panel.dataset.vmDraggable = "1"

    // Only the legend is enhanced (see the header), but the role stays in the
    // key so previously-stored legend positions keep resolving to the same
    // entry, and so a second draggable panel could be added without silently
    // colliding with this one.
    const key = overlayStorageKey(window.location.pathname, "legend", containerIndex(container))

    // The offset the reader actually asked for, kept separate from the one
    // currently applied. Anything that re-clamps -- a window resize, entering
    // fullscreen, an .ojs-grid bar rewrapping to a different height -- narrows
    // what can be *shown* without overwriting what was *chosen*. Collapsing
    // the two would mean fullscreening a chart, where the bounds are a
    // completely different shape, permanently rewrote the saved position.
    let desired = readStored(key) ?? {dx: 0, dy: 0}

    const apply = () => {
      const offset = clampOverlayOffset({
        dx: desired.dx,
        dy: desired.dy,
        offsetLeft: panel.offsetLeft,
        offsetTop: panel.offsetTop,
        width: panel.offsetWidth,
        height: panel.offsetHeight,
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight
      })
      if (offset.dx === 0 && offset.dy === 0) panel.style.transform = ""
      else panel.style.transform = `translate(${offset.dx}px, ${offset.dy}px)`
      return offset
    }

    // Appended last, not prepended. Either end interacts with styles.css's
    // `.ojs-row > div:first-of-type { flex: 1 1 200px }` /
    // `:last-of-type { flex: 0 0 auto }` sizing -- those were written as
    // :first-child/:last-child, which any inserted sibling would have knocked
    // out of matching entirely (":first-child" is "a div that is also the
    // first child", not "the first div"). They're -of-type now so the grip
    // can't disturb them, and the grip is position: absolute so it also takes
    // no .ojs-grid track. Last also puts it after the controls in tab order.
    const grip = document.createElement("button")
    grip.type = "button"
    grip.className = "vm-overlay-grip"
    grip.title = "Drag to move · double-click to reset"
    grip.setAttribute("aria-label", "Move this panel")
    grip.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="${GRIP_PATH}"></path></svg>`
    panel.append(grip)

    let dragging = false
    let startX = 0
    let startY = 0
    let startDx = 0
    let startDy = 0

    grip.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return
      // Start from what's on screen rather than from `desired`: if the panel
      // is currently clamped, the drag should continue from where it looks
      // like it is, not from an intent that's off the edge.
      const current = apply()
      desired = {dx: current.dx, dy: current.dy}
      startDx = current.dx
      startDy = current.dy
      startX = event.clientX
      startY = event.clientY
      dragging = true
      panel.classList.add("vm-overlay-dragging")
      if (grip.setPointerCapture) grip.setPointerCapture(event.pointerId)
      // Deliberately NOT event.preventDefault() here. Cancelling pointerdown
      // also suppresses the compatibility mouse events the browser would
      // synthesize from it -- click and dblclick included -- so the
      // double-click-to-reset binding below silently never fired. The text
      // selection preventDefault was there to stop is handled by
      // `user-select: none` on the grip in styles.css instead, and the
      // dragstart listener below covers the native image-drag.
    })

    grip.addEventListener("dragstart", (event) => event.preventDefault())

    grip.addEventListener("pointermove", (event) => {
      if (!dragging) return
      desired = {dx: startDx + (event.clientX - startX), dy: startDy + (event.clientY - startY)}
      apply()
    })

    const endDrag = (event) => {
      if (!dragging) return
      dragging = false
      panel.classList.remove("vm-overlay-dragging")
      if (grip.hasPointerCapture && grip.hasPointerCapture(event.pointerId)) {
        grip.releasePointerCapture(event.pointerId)
      }
      // Persist the clamped result here, unlike the transient re-clamps
      // below: at the end of a drag the clamped position IS what the reader
      // sees and chose, so storing the raw pointer delta would make the panel
      // jump on the next load.
      desired = apply()
      writeStored(key, desired)
    }

    grip.addEventListener("pointerup", endDrag)
    grip.addEventListener("pointercancel", endDrag)

    const reset = () => {
      desired = {dx: 0, dy: 0}
      apply()
      clearStored(key)
    }

    grip.addEventListener("dblclick", (event) => {
      event.preventDefault()
      reset()
    })

    // A pointer-only drag would be unreachable by keyboard, and the grip is
    // already a focusable button.
    grip.addEventListener("keydown", (event) => {
      let stepX = 0
      let stepY = 0
      if (event.key === "ArrowLeft") stepX = -1
      else if (event.key === "ArrowRight") stepX = 1
      else if (event.key === "ArrowUp") stepY = -1
      else if (event.key === "ArrowDown") stepY = 1
      else if (event.key === "Home") {
        event.preventDefault()
        reset()
        return
      } else return

      event.preventDefault()
      const amount = event.shiftKey ? 1 : 10
      desired = {dx: desired.dx + stepX * amount, dy: desired.dy + stepY * amount}
      desired = apply()
      writeStored(key, desired)
    })

    // Re-clamp when the space the panel lives in changes shape, WITHOUT
    // persisting -- see the desired/applied split above. A panel whose cell
    // re-ran is detached but its observers would outlive it, so they tear
    // themselves down the first time they fire on a disconnected node (the
    // same idiom as VM.plotting.autoResize).
    let resizeObserver = null
    const reclamp = () => {
      if (!panel.isConnected) {
        if (resizeObserver) resizeObserver.disconnect()
        document.removeEventListener("fullscreenchange", reclamp)
        return
      }
      apply()
    }

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(reclamp)
      resizeObserver.observe(container)
      resizeObserver.observe(panel)
    }
    document.addEventListener("fullscreenchange", reclamp)

    apply()
  }

  const enhanceAll = (root) => {
    const scope = root && root.querySelectorAll ? root : document
    for (const panel of scope.querySelectorAll(PANEL_SELECTOR)) enhance(panel)
  }

  const start = () => {
    enhanceAll(document)
    if (typeof MutationObserver === "undefined" || !document.body) return
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (node.matches && node.matches(PANEL_SELECTOR)) enhance(node)
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
