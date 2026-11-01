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
// page; a custom-template listing (one that only emits data, say) is
// skipped. The emptied margin sidebar is removed and <main>, which Quarto
// stopped short of it (.column-page-left), takes the full page column.
// Quarto's entries are click-only divs; every entry, "All" included, also
// gets role="button", a tab stop, and Enter/Space to activate it. Divs
// rather than <button>s, so a site's cloud CSS meets no browser button
// styles. Without JS the cloud stays in the margin. Idempotent: the cloud is
// marked data-vm-cloud-ready.
(function attachCategoryCloud(globalThis) {
  function init() {
    const cloud = document.querySelector(".quarto-listing-category:not([data-vm-cloud-ready])")
    const listing = document.querySelector(
      ".quarto-listing-container-grid, .quarto-listing-container-default, .quarto-listing-container-table"
    )
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})(window)
