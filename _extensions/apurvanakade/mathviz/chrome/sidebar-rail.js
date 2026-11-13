/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Sidebar rail: opt-in with `mathviz: {sidebar-rail: true}` (or a string,
// the localStorage key the pin is kept under; see mathviz.lua). Quarto's
// sidebar (#quarto-sidebar) is off-canvas only below 992px; sidebar-rail.css
// makes it off-canvas at every width, driven by .vm-sidebar-open and
// .vm-sidebar-pinned on <body>, which this script owns. In exchange it
// provides a permanently visible way back in: a slim rail at the left edge
// with a hamburger to open the sidebar and a pin to keep it open across
// pages. Escape, a click outside, or the hamburger again closes it.
//
// No hover-to-open. It fired on any pointer drift into the left edge, and
// every accidental open wrote .vm-sidebar-open onto <body>, a class list
// chart pages observe (VM.plotting.onThemeChange); it also needed a
// full-height rail box to catch the pointer, which lay over the body text's
// left edge below 768px.
//
// A plain, synchronous dependency script in <head>. It puts
// html.vm-sidebar-rail on at once, so the scoped rules in sidebar-rail.css
// apply before the first paint, and takes it off again at DOMContentLoaded
// on a page with no Quarto sidebar navigation, where it does nothing else.
// In embed mode (html.vm-embed) the class stays, for the page grid, and no
// rail is built.
(function attachSidebarRail() {
  var root = document.documentElement
  root.classList.add("vm-sidebar-rail")

  function init() {
    var sidebar = document.getElementById("quarto-sidebar")
    if (!sidebar || !sidebar.classList.contains("sidebar-navigation")) {
      root.classList.remove("vm-sidebar-rail")
      return
    }
    // Embed mode (?embed=1) hides the sidebar, so there is nothing to open;
    // the class stays so the grid still gives the app the sidebar's track.
    if (root.classList.contains("vm-embed")) return

    var keyMeta = document.querySelector('meta[name="mathviz:sidebar-pin-key"]')
    var PIN_KEY = (keyMeta && keyMeta.getAttribute("content")) || "vm-sidebar-pinned"
    var body = document.body

    // The sidebar and rail start just under the navbar (--vm-header-height)
    // and, below 992px, under Quarto's breadcrumb bar too
    // (--vm-secondary-nav-height). Both heights depend on the theme, the
    // brand wrapping and the breadcrumbs' length, so they are measured, and
    // re-measured whenever either bar resizes: the collapsed navbar menu
    // opening changes the header's height with no window resize.
    var secondaryNav = document.querySelector(".quarto-secondary-nav")
    var header = document.getElementById("quarto-header")
    function updateNavHeights() {
      var style = root.style
      var h = secondaryNav ? secondaryNav.getBoundingClientRect().height : 0
      style.setProperty("--vm-secondary-nav-height", h + "px")
      // The breadcrumb bar sits inside #quarto-header, and the CSS adds its
      // height separately, so it is left out of the header's.
      if (header) {
        var inside = secondaryNav && header.contains(secondaryNav) ? h : 0
        style.setProperty("--vm-header-height", header.getBoundingClientRect().height - inside + "px")
      }
    }
    updateNavHeights()
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(updateNavHeights)
      if (header) observer.observe(header)
      if (secondaryNav) observer.observe(secondaryNav)
    } else {
      window.addEventListener("resize", updateNavHeights)
    }
    // Web fonts arriving late can change the navbar's height.
    if (document.fonts) document.fonts.ready.then(updateNavHeights)

    var rail = document.createElement("div")
    rail.id = "vm-sidebar-rail"
    // The buttons live in their own wrapper, which carries the painted
    // surface (.vm-rail-cluster in sidebar-rail.css).
    rail.innerHTML =
      '<div class="vm-rail-cluster">' +
      '<button type="button" data-vm-toggle aria-label="Open sidebar navigation" aria-expanded="false" title="Show navigation">' +
      '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>' +
      "</button>" +
      '<button type="button" data-vm-pin aria-label="Keep sidebar open" aria-pressed="false" title="Keep sidebar open">' +
      '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.037l-1.394 1.393c.18.613.185 1.373.021 2.023-.212.828-.696 1.747-1.435 2.486l-.104.104a.5.5 0 0 1-.707 0l-2.404-2.404-2.968 2.967c-.09.09-.203.203-.401.401-.081.08-.181.18-.297.294a1.001 1.001 0 0 1-.399.245.998.998 0 0 1-.797-.061.998.998 0 0 1-.4-.245l-.106-.106a1 1 0 0 1-.06-.797 1 1 0 0 1 .245-.399l.294-.297.401-.401 2.967-2.968-2.404-2.404a.5.5 0 0 1 0-.707l.104-.104c.739-.739 1.658-1.223 2.486-1.435.65-.164 1.41-.159 2.023.021L9.617 2.65a5 5 0 0 1-.037-.46c0-.431.108-1.023.588-1.503A.5.5 0 0 1 9.828.722z"/></svg>' +
      "</button>" +
      "</div>"
    body.appendChild(rail)

    var toggleBtn = rail.querySelector("[data-vm-toggle]")
    var pinBtn = rail.querySelector("[data-vm-pin]")

    function isPinned() {
      try { return localStorage.getItem(PIN_KEY) === "1" } catch (e) { return false }
    }

    function setPinned(pinned) {
      try { localStorage.setItem(PIN_KEY, pinned ? "1" : "0") } catch (e) { /* storage unavailable */ }
      body.classList.toggle("vm-sidebar-pinned", pinned)
      pinBtn.setAttribute("aria-pressed", String(pinned))
    }

    function openSidebar() {
      body.classList.add("vm-sidebar-open")
      toggleBtn.setAttribute("aria-expanded", "true")
    }

    function closeSidebar() {
      if (isPinned()) return
      body.classList.remove("vm-sidebar-open")
      toggleBtn.setAttribute("aria-expanded", "false")
    }

    toggleBtn.addEventListener("click", function () {
      if (body.classList.contains("vm-sidebar-open")) {
        setPinned(false)
        closeSidebar()
      } else {
        openSidebar()
      }
    })

    pinBtn.addEventListener("click", function () {
      var next = !isPinned()
      setPinned(next)
      if (next) openSidebar()
    })

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return
      if (!body.classList.contains("vm-sidebar-open")) return
      setPinned(false)
      closeSidebar()
    })

    document.addEventListener("click", function (event) {
      if (!body.classList.contains("vm-sidebar-open")) return
      if (isPinned()) return
      if (sidebar.contains(event.target) || rail.contains(event.target)) return
      closeSidebar()
    })

    if (isPinned()) {
      setPinned(true)
      openSidebar()
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
