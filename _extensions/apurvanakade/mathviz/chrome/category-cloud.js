/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// A listing's category cloud (`categories: cloud`) moved out of the right
// margin and above the cards, with an "All" entry that clears the filter:
// opt-in with `mathviz: {category-cloud: true}`. Quarto puts the cloud in
// the margin sidebar, which is narrow beside a grid and hidden on a phone,
// and gives it no visible way back once a category is picked (its
// "Categories" heading clears the filter, but reads as a heading).
//
// Script only, no stylesheet: each site styles its cloud itself, against
// Quarto's own .category / .active classes and two hooks added here --
// <div class="vm-category-cloud"> around the moved cloud, and
// .category--all on the "All" entry. All carries .active while no category
// is picked, the way the picked one does.
//
// The entries keep their elements, so Quarto's click handlers and its
// #category= hash come along. "All" is an entry with an empty data-category,
// which quarto-listing.js reads as "no filter" (btoa("") is ""): its
// activateCategory("") marks it active, and a click on it goes through
// Quarto's public window.quartoListingCategory(""). That is bound here
// rather than left to quarto-listing.js, which attaches its handlers on
// DOMContentLoaded -- a listener registered before this file's, since
// Quarto's scripts come first in <head>, so it has run by the time this
// one does.
//
// The cloud goes above the first grid, default or table listing on the
// page. A custom-template listing is used only when the page has none of
// those: one beside a built-in listing may only emit data, say, but a page
// whose one listing is custom (a plain list of posts) wants its cloud
// there. The emptied margin sidebar is removed and <main>, which Quarto
// stopped short of it (.column-page-left), takes the full page column.
// Quarto's entries are click-only divs; every entry, "All" included, also
// gets role="button", a tab stop, and Enter/Space to activate it. Divs
// rather than <button>s, so a site's cloud CSS meets no browser button
// styles. Without JS the cloud stays in the margin. Idempotent: the cloud is
// marked data-vm-cloud-ready.
//
// Back and Forward follow the filter both ways. Quarto pushes a history
// entry per pick, and the listing page's inline script re-runs
// quarto-listing-loaded on hashchange, which re-applies the category -- but
// only a non-empty one: going back to a page with no hash, or to the
// "#category=" All leaves, kept the last filter and its highlight. Here an
// empty category clears the filter -- through Quarto's window["quarto-listings"]
// (the List.js instances its listing script registers), not
// quartoListingCategory(""), which would push a new entry and drop the
// Forward history. Any other hash (#fn1, a heading's anchor) is an in-page
// link, not a listing state, and leaves the filter alone.
//
// A pick that leaves the cloud above the viewport scrolls it back into view.
// A tag on a card far down the grid filters in place too, and the shorter
// page used to clamp the reader to its bottom, past every card left. The
// cloud's scroll-margin-top is the site's to set (room for a fixed navbar).
(function attachCategoryCloud(globalThis) {
  function init() {
    const cloud = document.querySelector(".quarto-listing-category:not([data-vm-cloud-ready])")
    const listing =
      document.querySelector(
        ".quarto-listing-container-grid, .quarto-listing-container-default, .quarto-listing-container-table"
      ) ?? document.querySelector(".quarto-listing-container-custom")
    if (!cloud || !listing) return
    cloud.setAttribute("data-vm-cloud-ready", "")

    const margin = cloud.closest("#quarto-margin-sidebar")
    const wrapper = document.createElement("div")
    wrapper.className = "vm-category-cloud"
    wrapper.appendChild(cloud)
    listing.parentNode.insertBefore(wrapper, listing)

    if (margin) {
      for (const title of margin.querySelectorAll(".quarto-listing-category-title")) title.remove()
      if (margin.children.length === 0) {
        margin.remove()
        const main = document.querySelector("main.column-page-left")
        if (main) main.classList.replace("column-page-left", "column-page")
      }
    }

    const all = document.createElement("div")
    all.className = "category category--all"
    all.dataset.category = ""
    all.textContent = "All"
    if (!cloud.querySelector(".category.active")) all.classList.add("active")
    all.onclick = () => {
      if (typeof globalThis.quartoListingCategory === "function") globalThis.quartoListingCategory("")
    }
    cloud.insertBefore(all, cloud.firstChild)

    for (const entry of cloud.querySelectorAll(".category")) {
      entry.setAttribute("role", "button")
      entry.tabIndex = 0
    }
    cloud.addEventListener("keydown", (event) => {
      const entry = event.target.closest(".category")
      if (!entry || (event.key !== "Enter" && event.key !== " ")) return
      event.preventDefault()
      entry.click()
    })

    globalThis.addEventListener("hashchange", () => {
      const hash = globalThis.location.hash
      if (hash.length > 1 && !/(?:^#|&)category=/.test(hash)) return
      if (hashCategory(hash) !== "") return
      for (const entry of cloud.querySelectorAll(".category.active")) entry.classList.remove("active")
      all.classList.add("active")
      for (const list of Object.values(globalThis["quarto-listings"] ?? {})) list?.filter()
    })

    // The observer's callback runs after the whole click handler, so the
    // list is already filtered and the page already shorter.
    new MutationObserver(() => {
      if (wrapper.getBoundingClientRect().top < 0) wrapper.scrollIntoView({ block: "start" })
    }).observe(cloud, { subtree: true, attributes: true, attributeFilter: ["class"] })
  }

  // The category in a Quarto listing hash (#category=<uri>&<id>-page=<n>),
  // decoded; "" when there is none.
  function hashCategory(hash) {
    const match = /(?:^#|&)category=([^&]*)/.exec(hash)
    if (!match) return ""
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})(window)
