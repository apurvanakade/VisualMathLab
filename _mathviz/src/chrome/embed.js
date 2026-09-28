/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Embed mode: opt-in with `mathviz: {embed: true}` (share turns it on too).
// Another site frames one of a site's apps with
//   <iframe src="https://example.com/apps/newton-method/?embed=1&f=...">
// and gets the app alone -- embed.css hides the navbar, sidebar, rail, title
// block, footer and page navigation on html.vm-embed, plus everything in the
// content column that is not the page's tagged app (the <div class="vm-app">
// each app page wraps its controls and chart in), and every mathviz chrome
// script (sidebar rail, mobile warning, report-bug, share) skips itself.
// This runs in <head> -- it is a plain, synchronous dependency script -- so
// the class goes on <html> (<body> doesn't exist yet) and the chrome never
// paints at all: no flash of navbar before the CSS applies.
//
// embed=1 shows the page's first .vm-app. A page with several tagged blocks
// gives each an id, and embed=<id> shows that one instead. Either way, once
// the DOM exists the chosen block gets vm-app-active, and embed.css shows
// only that block, what is inside it and its ancestors (Quarto wraps
// everything under a ## heading in a <section>, so a block is not
// necessarily a direct child of the content column). Until then the content
// column is blank -- DOMContentLoaded comes well before OJS draws anything,
// so nothing visible is ever hidden. An id no block on the page carries
// falls back to the first block rather than showing nothing.
//
// history.replaceState is wrapped because apps rewrite the URL with their
// current inputs -- most start from location.search and so would keep embed,
// but a page that builds its query string from scratch would drop it, and
// the next reactive rerender would flash the chrome back in. Same-origin
// URLs only; a page never passes anything else.
(function () {
  var embed = new URLSearchParams(location.search).get("embed")
  if (embed == null || embed === "") return
  document.documentElement.classList.add("vm-embed")
  document.addEventListener("DOMContentLoaded", function () {
    var block = null
    if (embed !== "1") block = document.getElementById(embed)
    if (block === null || !block.classList.contains("vm-app")) {
      block = document.querySelector(".vm-app")
    }
    if (block !== null) block.classList.add("vm-app-active")
  })
  var replaceState = history.replaceState.bind(history)
  history.replaceState = function (state, title, url) {
    if (url != null) {
      var next = new URL(String(url), location.href)
      if (next.origin === location.origin && !next.searchParams.has("embed")) {
        next.searchParams.set("embed", embed)
      }
      url = next.pathname + next.search + next.hash
    }
    return replaceState(state, title, url)
  }
})()
