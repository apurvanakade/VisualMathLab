/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// One-time "built for a bigger screen" notice, shown on a phone only: opt-in
// with `mathviz: {mobile-warning: ...}`, below the 991.98px breakpoint
// (Bootstrap's lg). A mathviz chart floats its trace legend over the plot
// and sizes itself to the viewport, which on a phone leaves the curve
// cramped under the legend; the chart's fullscreen button is the fix.
//
// The copy is deliberately short -- "meant for larger screens, tap
// fullscreen if a plot isn't fully visible" -- rather than spelling out
// which control is hidden and why; a phone visitor doesn't need the
// mechanics, only the fix. Shown once, then remembered in localStorage under
// the mathviz:mobile-warning-key meta (a string option value names it, so a
// site's privacy page can list it) or "vm-mobile-warning-dismissed".
(function attachMobileWarning(globalThis) {
  const BREAKPOINT = "(max-width: 991.98px)"

  function init() {
    // Embed mode (?embed=1): the framing site decides how much room the app
    // gets; a warning about this site's layout would be about the wrong page.
    if (document.documentElement.classList.contains("vm-embed")) return
    if (!globalThis.matchMedia(BREAKPOINT).matches) return

    const keyMeta = document.querySelector('meta[name="mathviz:mobile-warning-key"]')
    let key = "vm-mobile-warning-dismissed"
    if (keyMeta) key = keyMeta.getAttribute("content")

    try {
      if (localStorage.getItem(key) === "1") return
    } catch (e) {
      /* Storage blocked: show it, it just won't stay dismissed. */
    }

    const banner = document.createElement("div")
    banner.id = "vm-mobile-warning"
    banner.className = "vm-mobile-warning"
    banner.setAttribute("role", "dialog")
    banner.setAttribute("aria-labelledby", "vm-mobile-warning-title")
    banner.innerHTML =
      '<div class="vm-mobile-warning-inner">' +
      '<h2 id="vm-mobile-warning-title" class="vm-mobile-warning-title">Built for a bigger screen</h2>' +
      '<p class="vm-mobile-warning-text">This site is meant for larger screens. If a plot isn\'t fully visible, tap its fullscreen button.</p>' +
      '<div class="vm-mobile-warning-buttons">' +
      '<button type="button" class="vm-mobile-warning-btn" data-mobile-warning-dismiss>Got it</button>' +
      "</div>" +
      "</div>"
    document.body.appendChild(banner)

    banner.querySelector("[data-mobile-warning-dismiss]").addEventListener("click", function () {
      try {
        localStorage.setItem(key, "1")
      } catch (e) {
        /* Private browsing with storage blocked: the choice just won't stick. */
      }
      banner.remove()
    })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})(window)
