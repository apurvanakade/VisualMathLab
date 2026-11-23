/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// A same-page link (a cross-reference, the table of contents, a footnote)
// scrolls to its target instead of jumping. On for every page the filter
// runs on; `mathviz: {smooth-scroll: false}` turns it off. The scrolling
// itself is one CSS property (smooth-scroll.css); this script exists for
// Quarto's fixed navbar.
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
// The stylesheet's rules are scoped to the class this script sets, so the
// property is never on without the offset (a blocked or failed script
// leaves Quarto's own jump, navbar offset included).
//
// Nothing here takes a click or touches history: the address, the history
// entry and Back stay the browser's own, and Back restores the scroll
// position an entry was left at, at once. That is the reason not to use
// Quarto's `smooth-scroll: true`, which loads a script (zenscroll) that
// takes both over; on a page that sets it, the filter leaves this out.
(function attachSmoothScroll(globalThis) {
  var document = globalThis.document
  var root = document.documentElement

  // The same element, and the same height, Quarto's own offset uses.
  function measure() {
    var header = document.querySelector("header.fixed-top")
    root.style.setProperty("--vm-scroll-offset", (header ? header.clientHeight : 0) + "px")
    return header
  }

  function init() {
    var header = measure()
    root.classList.add("vm-smooth-scroll")
    if (header && globalThis.ResizeObserver) new globalThis.ResizeObserver(measure).observe(header)
    else globalThis.addEventListener("resize", measure)
    // Web fonts arriving late can change the navbar's height.
    if (document.fonts) document.fonts.ready.then(measure)
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})(globalThis)
