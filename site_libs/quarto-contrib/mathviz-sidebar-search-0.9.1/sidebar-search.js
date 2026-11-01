/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// A search box at the top of Quarto's sidebar that narrows the menu to the
// entries whose title matches what the reader types: opt-in with
// `mathviz: {sidebar-search: true}`. It matches titles only, in place,
// offline. It is not Quarto's full-text search, which allows one widget per
// page (#quarto-search) and usually lives in the navbar.
//
// An entry whose own title matches keeps everything under it; any other
// entry shows only its matching descendants and is hidden when it has none.
// While a query is active every section on the way to a match is expanded;
// clearing the query restores each section's open/closed state as it was
// when the query started. Enter opens the first entry, in menu order, whose
// own title matches. Escape clears a non-empty box and stops there, so the
// sidebar rail's Escape-to-close waits for a second press. Nothing is
// stored.
(function attachSidebarSearch(globalThis) {
  // Lower case, no accents, no apostrophes (straight or curly, so
  // "sperners" finds "Sperner’s"), every other run of non-alphanumerics a
  // single space.
  const normalize = (text) => String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019\u201b\u2032']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

  // Whether every word of the query starts a word of the title: "ode" finds
  // "Methods for ODEs" but not "Model Fitting". An empty query matches
  // everything.
  const matches = (title, query) => {
    const words = normalize(query).split(" ").filter(Boolean)
    const padded = " " + normalize(title)
    return words.every((word) => padded.includes(" " + word))
  }

  const HIDDEN = "vm-sidebar-search-hidden"

  function init() {
    const sidebar = document.getElementById("quarto-sidebar")
    const menu = sidebar && sidebar.querySelector(".sidebar-menu-container")
    const root = menu && menu.querySelector(":scope > ul")
    if (!root) return

    const box = document.createElement("div")
    box.className = "vm-sidebar-search"
    box.setAttribute("role", "search")
    const input = document.createElement("input")
    input.type = "search"
    input.placeholder = "Search"
    input.setAttribute("aria-label", "Search page titles")
    input.autocomplete = "off"
    input.spellcheck = false
    box.appendChild(input)
    menu.parentNode.insertBefore(box, menu)

    const empty = document.createElement("div")
    empty.className = "vm-sidebar-search-empty " + HIDDEN
    empty.setAttribute("role", "status")
    empty.textContent = "No matching pages"
    menu.parentNode.insertBefore(empty, menu.nextSibling)

    // The menu as a tree of {li, title, list, children}, read once: the
    // sidebar is server-rendered and nothing rewrites it.
    const read = (ul) => Array.from(ul.querySelectorAll(":scope > li.sidebar-item"), (li) => {
      const label = li.querySelector(":scope > .sidebar-item-container .menu-text")
      const list = li.querySelector(":scope > ul.sidebar-section")
      return { li, title: label ? label.textContent : "", list, children: list ? read(list) : [] }
    })
    const tree = read(root)
    const lists = Array.from(root.querySelectorAll("ul.sidebar-section"))
    let saved = null

    // Opens or closes a section the way Bootstrap's collapse leaves it:
    // `show` on the list, and on its toggle `aria-expanded` (which Quarto's
    // chevron is drawn from) and `collapsed`.
    const setOpen = (list, open) => {
      list.classList.toggle("show", open)
      const toggle = list.parentElement.querySelector(":scope > .sidebar-item-container .sidebar-item-toggle")
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(open))
        toggle.classList.toggle("collapsed", !open)
      }
    }

    // Shows or hides one entry and everything under it; returns whether it
    // is shown.
    const filter = (entry, query, keepAll) => {
      const own = keepAll || matches(entry.title, query)
      let shown = own
      for (const child of entry.children) {
        if (filter(child, query, own)) shown = true
      }
      entry.li.classList.toggle(HIDDEN, !shown)
      if (entry.list && shown) setOpen(entry.list, true)
      return shown
    }

    const apply = () => {
      const query = input.value
      if (!normalize(query)) {
        for (const li of root.querySelectorAll("li." + HIDDEN)) li.classList.remove(HIDDEN)
        if (saved) lists.forEach((list, i) => setOpen(list, saved[i]))
        saved = null
        empty.classList.add(HIDDEN)
        return
      }
      // Remembered when a query starts, not at load: the reader may have
      // opened or closed sections since.
      if (!saved) saved = lists.map((list) => list.classList.contains("show"))
      let any = false
      for (const entry of tree) {
        if (filter(entry, query, false)) any = true
      }
      empty.classList.toggle(HIDDEN, any)
    }

    // The first entry, in menu order, whose own title matches and that
    // links somewhere: a section shown only for one of its pages shouldn't
    // win over that page.
    const firstMatch = (entries, query) => {
      for (const entry of entries) {
        const link = entry.li.querySelector(":scope > .sidebar-item-container a.sidebar-link[href]")
        if (link && matches(entry.title, query)) return link
        const inner = firstMatch(entry.children, query)
        if (inner) return inner
      }
      return null
    }

    input.addEventListener("input", apply)
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && input.value) {
        event.stopPropagation()
        input.value = ""
        apply()
      } else if (event.key === "Enter" && normalize(input.value)) {
        const link = firstMatch(tree, input.value)
        if (link) {
          event.preventDefault()
          globalThis.location.href = link.href
        }
      }
    })
  }

  // Not in embed mode, where the sidebar is hidden anyway.
  const embedded = document.documentElement?.classList?.contains("vm-embed")
  if (!embedded) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init)
    } else {
      init()
    }
  }

  const VM = globalThis.VM || (globalThis.VM = {})
  VM.chrome = { ...VM.chrome, sidebarSearch: { normalize, matches } }
})(window)
