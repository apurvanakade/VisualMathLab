/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  const REPO = "apurvanakade/VisualMathLab"

  // Maps a rendered page's pathname (e.g. "/apps/newton-method/",
  // ".../index.html", or "/") back to its .qmd source path in the repo
  // (e.g. "apps/newton-method/index.qmd"). This works because the
  // site is served from a custom domain at the repo root (site-url in
  // _quarto.yml), so a rendered page's pathname already matches its source
  // file's path one-for-one, just with index.html swapped for index.qmd.
  // Returns null for a pathname that isn't a normal content page (e.g. one
  // ending in some other extension).
  const qmdSourcePath = (pathname) => {
    let path = pathname
    if (path.endsWith("/")) path += "index.html"
    if (!path.endsWith(".html")) return null
    path = path.replace(/\.html$/, ".qmd")
    if (path.startsWith("/")) path = path.slice(1)
    return path
  }

  const truncate = (text, maxLength) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 1).trimEnd() + "…"
  }

  // Builds a GitHub "new issue" URL prefilled with the page, a link to its
  // .qmd source, and (when the reader had text selected) that passage
  // quoted in the body -- so a report captures exactly what was on screen
  // without the reporter re-typing it. Pure function of its inputs so it's
  // unit-testable without a real DOM/location.
  const buildReportBugUrl = ({ pageUrl, pageTitle, sourcePath, selectedText }) => {
    const title = selectedText
      ? `Bug: "${truncate(selectedText, 60)}"`
      : `Bug: ${pageTitle}`

    let body = `**Page:** ${pageUrl}\n`
    if (sourcePath) body += `**Source:** https://github.com/${REPO}/blob/main/${sourcePath}\n`
    if (selectedText) {
      body += `\n**Selected text/section:**\n\n> ${selectedText.replace(/\n/g, "\n> ")}\n`
    }
    body += `\n**What's wrong:**\n\n`

    const params = new URLSearchParams()
    params.set("title", title)
    params.set("body", body)
    params.set("labels", "bug")
    return `https://github.com/${REPO}/issues/new?${params.toString()}`
  }

  // Floating "Report bug" button that appears next to the current text
  // selection, so a reader can flag a specific passage instead of only
  // being able to file a generic issue from the navbar icon.
  let popup = null

  const removePopup = () => {
    if (popup) {
      popup.remove()
      popup = null
    }
  }

  const showPopup = (selection, selectedText) => {
    removePopup()

    const rect = selection.getRangeAt(0).getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return

    popup = document.createElement("button")
    popup.type = "button"
    popup.className = "vm-report-bug-popup"
    popup.textContent = "Report bug"
    popup.style.top = `${rect.top + globalThis.scrollY - 36}px`
    popup.style.left = `${rect.left + globalThis.scrollX}px`

    // Prevent the button's own mousedown from collapsing the text
    // selection before the click handler below gets to read it.
    popup.addEventListener("mousedown", (event) => event.preventDefault())
    popup.addEventListener("click", () => {
      const url = buildReportBugUrl({
        pageUrl: globalThis.location.href,
        pageTitle: document.title,
        sourcePath: qmdSourcePath(globalThis.location.pathname),
        selectedText
      })
      globalThis.open(url, "_blank", "noopener")
      removePopup()
    })

    document.body.appendChild(popup)
  }

  let debounceId = null
  document.addEventListener("selectionchange", () => {
    clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      const selection = document.getSelection()
      const selectedText = selection && !selection.isCollapsed ? selection.toString().trim() : ""
      if (!selectedText) {
        removePopup()
        return
      }
      showPopup(selection, selectedText)
    }, 200)
  })

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, qmdSourcePath, buildReportBugUrl}}
})(window)
