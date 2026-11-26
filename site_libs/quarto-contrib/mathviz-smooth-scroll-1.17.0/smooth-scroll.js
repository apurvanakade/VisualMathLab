/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// A same-page link (a cross-reference, the table of contents, a footnote)
// scrolls to its target instead of jumping. On for every page the filter
// runs on; `mathviz: {smooth-scroll: false}` turns it off. The scrolling
// itself is one CSS property (smooth-scroll.css); this script exists for
// Quarto's fixed navbar, and to hold the target of a link into the page
// while the page renders (below).
//
// Quarto makes room for the navbar from script: on every `hashchange` its
// quarto-nav.js scrolls back up by the height of `header.fixed-top` -- and
// skips that when the root's computed `scroll-behavior` is "smooth", since
// a second scroll would cut the first one short. It puts nothing in that
// step's place, so with the property alone a link to a place higher up the
// page (which brings the navbar back) lands its target underneath the
// navbar. The replacement is `scroll-padding-top`, which needs the navbar's
// height, which a stylesheet can't know: it depends on the theme, the brand
// wrapping and whether the collapsed menu is open. So it is measured here
// into --vm-scroll-offset, and re-measured whenever the header resizes.
//
// Neither offset reaches element.scrollIntoView() the same way: the padding
// is there only with this on and motion allowed, Quarto's step only on a
// hashchange. A script's scroll to an element goes through
// VM.ui.scrollIntoView (src/js/ui/scroll-into-view.js), which measures the
// navbar itself and lands where a link would in every mode; the class and
// --vm-scroll-offset are this file's internals, not for sites to read.
//
// The stylesheet's rules are scoped to the class this script sets, so the
// property is never on without the offset (a blocked or failed script
// leaves Quarto's own jump, navbar offset included).
//
// Nothing here takes a click or touches history: the address, the history
// entry and Back stay the browser's own, and Back restores the scroll
// position an entry was left at, at once. That is the reason not to use
// Quarto's `smooth-scroll: true`, which loads a script (zenscroll) that
// takes both over; on a page that sets it, the filter leaves this out.
//
// Arriving at a link into the page (`page/#section`, from another page or
// the address bar) is the one scroll this script makes itself. The browser
// aims its scroll at where the target is when the page first lays out, and
// OJS cells, charts and typeset math above the target then render and push
// it down the page, by thousands of pixels on a page of apps. An instant
// scroll survives that where the browser anchors the scroll position; the
// smooth one is still on its way when the page grows, isn't anchored, and
// stops short. So the target is held: put in place at once, and put back
// each time the page changes height, until the reader takes over (a wheel,
// a touch, a key, a press) or the page has stopped growing. A reload and
// Back/Forward are left alone: there the browser restores the position
// the reader left, which need not be the target's.
(function attachSmoothScroll(globalThis) {
  var document = globalThis.document
  var root = document.documentElement
  // How long the page must keep its height, once loaded, for the hold on
  // an arrival's target to end.
  var HOLD_QUIET_MS = 2000
  var RELEASE_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"]
  var offset = 0

  // The same element, and the same height, Quarto's own offset uses.
  function measure() {
    var header = document.querySelector("header.fixed-top")
    offset = header ? header.clientHeight : 0
    root.style.setProperty("--vm-scroll-offset", offset + "px")
    return header
  }

  // The element the address's fragment names, on a fresh arrival only.
  function arrivalTarget() {
    var performance = globalThis.performance
    var entry = performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null
    if (!entry || entry.type !== "navigate") return null
    var id = globalThis.location.hash.slice(1)
    if (!id) return null
    try {
      id = decodeURIComponent(id)
    } catch (err) {
      // A malformed escape: the browser matches the raw text, so do the same.
    }
    return document.getElementById(id)
  }

  function holdArrivalTarget() {
    var target = arrivalTarget()
    if (!target || !globalThis.ResizeObserver) return
    var timer = null
    var observer = null

    function release() {
      globalThis.clearTimeout(timer)
      observer.disconnect()
      for (var i = 0; i < RELEASE_EVENTS.length; i++) globalThis.removeEventListener(RELEASE_EVENTS[i], release, true)
      globalThis.removeEventListener("hashchange", release)
      globalThis.removeEventListener("load", restartTimer)
    }

    // The quiet period counts from the load event: before it, a pause in
    // the page's growth is a script still on its way.
    function restartTimer() {
      globalThis.clearTimeout(timer)
      if (document.readyState === "complete") timer = globalThis.setTimeout(release, HOLD_QUIET_MS)
    }

    // The target's top to where a same-page link leaves it: below the
    // navbar. Nothing to do for a target that isn't drawn (a closed tab).
    function pin() {
      if (target.getClientRects().length > 0) {
        var away = target.getBoundingClientRect().top - offset
        if (Math.abs(away) >= 1) globalThis.scrollTo({ top: globalThis.scrollY + away, behavior: "instant" })
      }
      restartTimer()
    }

    for (var i = 0; i < RELEASE_EVENTS.length; i++) globalThis.addEventListener(RELEASE_EVENTS[i], release, { capture: true, passive: true })
    globalThis.addEventListener("hashchange", release)
    globalThis.addEventListener("load", restartTimer)
    // Calls pin once on observing, then on every change of the page's height.
    observer = new globalThis.ResizeObserver(pin)
    observer.observe(document.body)
  }

  function init() {
    var header = measure()
    root.classList.add("vm-smooth-scroll")
    holdArrivalTarget()
    if (header && globalThis.ResizeObserver) new globalThis.ResizeObserver(measure).observe(header)
    else globalThis.addEventListener("resize", measure)
    // Web fonts arriving late can change the navbar's height.
    if (document.fonts) document.fonts.ready.then(measure)
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})(globalThis)
