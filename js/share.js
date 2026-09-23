/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Every embed snippet points at the public site, not wherever this page
  // happens to be served from (a `quarto preview` port, a PR deploy) -- a
  // snippet copied from a preview must still work when pasted somewhere
  // else. Matches site-url in _quarto.yml.
  const SITE_ORIGIN = "https://www.visualmathlab.com"

  // Pure builders (exported as VML.share below for js/share.test.js) -- no
  // DOM, so they don't need a real `document`/`location` to test.

  // The page's path relative to the site root, which is what the public
  // URL needs. location.pathname alone isn't: served from anywhere but the
  // site root (a local server over the repo, where it reads /docs/apps/...,
  // or a subpath deploy) it carries a prefix the public site doesn't have.
  // `offset` is Quarto's quarto:offset meta -- the relative path from this
  // page back to the root ("../../" for an app page) -- so resolving it
  // against the page gives the root as served, and everything after that
  // is the site-relative path.
  const siteRelativePath = ({ href, offset }) => {
    const pathname = new URL(href).pathname
    if (!offset) return pathname
    const root = new URL(offset, href).pathname
    if (!pathname.startsWith(root)) return pathname
    return "/" + pathname.slice(root.length)
  }

  // Builds the absolute URL an <iframe src> should use: the given page,
  // carrying its current inputs when `keepInputs` is true, with `embed`
  // set to the block's id (or "1" for the page's first/only app).
  const embedSrc = ({ pathname, search, blockId, keepInputs }) => {
    let path = pathname
    if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length)

    const params = new URLSearchParams(keepInputs ? search : "")
    params.delete("embed")
    params.set("embed", blockId || "1")

    return `${SITE_ORIGIN}${path}?${params.toString()}`
  }

  // Builds the absolute URL of the page itself (the whole page, not the
  // embed view), with or without the current inputs. An `embed` param is
  // always dropped -- a shared link should open the full page -- and a
  // link with no inputs left carries no bare trailing "?".
  const pageUrl = ({ pathname, search, keepInputs }) => {
    let path = pathname
    if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length)

    const params = new URLSearchParams(keepInputs ? search : "")
    params.delete("embed")

    const query = params.toString()
    if (query === "") return `${SITE_ORIGIN}${path}`
    return `${SITE_ORIGIN}${path}?${query}`
  }

  // Builds the exact <iframe> block embed.qmd documents, so the page and
  // the button never drift apart. `&` between attributes is left raw, as in
  // embed.qmd -- it isn't a valid entity reference there, so it pastes as
  // plain text with no HTML-decoding surprise.
  const buildEmbedSnippet = ({ src, height, title }) => {
    const escapedTitle = title.replace(/"/g, "&quot;")
    return `<iframe\n` +
      `  src="${src}"\n` +
      `  width="100%" height="${height}" loading="lazy"\n` +
      `  title="${escapedTitle}">\n` +
      `</iframe>`
  }

  // Not in embed mode: an app framed by another site is that site's
  // content, and a Share button pointing back at this site would be noise
  // there -- the same reasoning js/report-bug.js already uses. styles.css
  // hides it too, belt and braces.
  const embedded = document.documentElement?.classList?.contains("vm-embed")

  if (!embedded) {
    // A block containing a Plotly chart gets the 900px embed.qmd
    // recommends (enough for every app's chart to clear 400px). A block
    // with no Plotly chart (an SVG figure, canvas, or no figure at all)
    // draws at its own fixed height and doesn't stretch to fill a taller
    // frame, so the default instead follows the block's own measured
    // height, rounded up to the nearest 20 and clamped to a sane range.
    const defaultHeight = (block) => {
      if (block.querySelector(".js-plotly-plot")) return 900
      const measured = block.getBoundingClientRect().height
      const rounded = Math.ceil(measured / 20) * 20
      return Math.min(1200, Math.max(320, rounded))
    }

    // The page's own title, stripped of the " – Visual Math Lab" suffix
    // every page's <title> carries (see the site's title-block markup) --
    // an iframe's own title attribute shouldn't repeat the site name.
    const pageTitle = () => {
      const heading = document.querySelector("#title-block-header .quarto-title h1, #title-block-header h1")
      if (heading) return heading.textContent.trim()
      return document.title.replace(/\s*[–-]\s*Visual Math Lab\s*$/, "").trim()
    }

    const sitePath = () => siteRelativePath({
      href: location.href,
      offset: document.querySelector('meta[name="quarto:offset"]')?.content
    })

    let dialog = null
    let activeBlock = null
    let copyResetId = null

    const currentSnippet = () => {
      const keepInputs = dialog.querySelector(".vm-share-keep-inputs").checked
      const height = dialog.querySelector(".vm-share-height").value || "900"
      const blockId = activeBlock.id || ""
      const src = embedSrc({
        pathname: sitePath(),
        search: location.search,
        blockId,
        keepInputs
      })
      return buildEmbedSnippet({ src, height, title: pageTitle() })
    }

    const renderSnippet = () => {
      dialog.querySelector(".vm-share-code").value = currentSnippet()
    }

    // The two page links are read from location.search when the dialog
    // opens, which the page's committed/urlSyncControls cells keep current.
    const renderLinks = () => {
      const withInputs = pageUrl({ pathname: sitePath(), search: location.search, keepInputs: true })
      const withoutInputs = pageUrl({ pathname: sitePath(), search: location.search, keepInputs: false })
      for (const [selector, url] of [[".vm-share-link-inputs", withInputs], [".vm-share-link-plain", withoutInputs]]) {
        const link = dialog.querySelector(selector)
        link.href = url
        link.textContent = url
      }
    }

    // Copies `text`, calling onCopied once it's on the clipboard and
    // onFailed when the Clipboard API is missing or refuses (an insecure
    // origin, a denied permission).
    const copyText = (text, onCopied, onFailed) => {
      if (globalThis.navigator?.clipboard?.writeText) {
        globalThis.navigator.clipboard.writeText(text).then(onCopied).catch(onFailed)
      } else {
        onFailed()
      }
    }

    const buildDialog = () => {
      const el = document.createElement("dialog")
      el.className = "vm-share-dialog"
      el.innerHTML = `
        <form method="dialog" class="vm-share-form">
          <h2>Share this app</h2>
          <h3>Link</h3>
          <p>Click a link to copy it.</p>
          <div class="vm-share-links">
            <span class="vm-share-link-label">With current inputs</span>
            <a class="vm-share-link vm-share-link-inputs"></a>
            <span class="vm-share-link-status" aria-live="polite"></span>
            <span class="vm-share-link-label">Without inputs</span>
            <a class="vm-share-link vm-share-link-plain"></a>
            <span class="vm-share-link-status" aria-live="polite"></span>
          </div>
          <h3>Embed</h3>
          <p>Paste this into another page to show the app alone, as an
          <code>&lt;iframe&gt;</code>. See <a class="vm-share-docs-link">Embedding an app</a>
          for details.</p>
          <label class="vm-share-checkbox-row">
            <input type="checkbox" class="vm-share-keep-inputs" checked>
            Keep the current inputs
          </label>
          <label class="vm-share-height-row">
            Frame height
            <input type="number" class="vm-share-height" min="200" max="2000" step="20">
          </label>
          <textarea class="vm-share-code" rows="5" readonly spellcheck="false"></textarea>
          <div class="vm-share-actions">
            <button type="button" class="vm-share-copy">Copy</button>
            <button type="submit" class="vm-share-close">Close</button>
          </div>
        </form>
      `
      document.body.appendChild(el)

      // Relative to the site root as served (quarto:offset), not a
      // root-absolute "/embed.html", which breaks whenever the site is
      // served under a prefix -- the same problem sitePath() solves.
      const offset = document.querySelector('meta[name="quarto:offset"]')?.content ?? "/"
      el.querySelector(".vm-share-docs-link").href = new URL(`${offset}embed.html`, location.href).href

      el.querySelector(".vm-share-keep-inputs").addEventListener("change", renderSnippet)
      el.querySelector(".vm-share-height").addEventListener("input", renderSnippet)

      const copyButton = el.querySelector(".vm-share-copy")
      copyButton.addEventListener("click", () => {
        const code = el.querySelector(".vm-share-code")
        const text = code.value

        const showCopied = () => {
          clearTimeout(copyResetId)
          const original = "Copy"
          copyButton.textContent = "Copied"
          copyResetId = setTimeout(() => { copyButton.textContent = original }, 1500)
        }

        const fallbackSelect = () => {
          code.select()
          copyButton.textContent = "Press ⌘C / Ctrl+C to copy"
          clearTimeout(copyResetId)
          copyResetId = setTimeout(() => { copyButton.textContent = "Copy" }, 2500)
        }

        copyText(text, showCopied, fallbackSelect)
      })

      // A link click only copies its URL -- the reader is already on this
      // page, so following it would just reload what they're looking at.
      // It stays a real <a href> so the browser's own "Copy link address"
      // still works. When the clipboard refuses, the URL text is selected
      // instead, for a manual copy, same as the Copy button's fallback.
      for (const link of el.querySelectorAll(".vm-share-link")) {
        const status = link.nextElementSibling
        let statusResetId = null
        const showStatus = (text, ms) => {
          clearTimeout(statusResetId)
          status.textContent = text
          statusResetId = setTimeout(() => { status.textContent = "" }, ms)
        }
        link.addEventListener("click", (event) => {
          event.preventDefault()
          copyText(link.href, () => showStatus("Copied", 1500), () => {
            const range = document.createRange()
            range.selectNodeContents(link)
            const selection = globalThis.getSelection()
            selection.removeAllRanges()
            selection.addRange(range)
            showStatus("Press ⌘C / Ctrl+C", 2500)
          })
        })
      }

      el.addEventListener("click", (event) => {
        if (event.target === el) el.close()
      })

      return el
    }

    const openDialogFor = (block) => {
      if (!dialog) dialog = buildDialog()
      activeBlock = block
      dialog.querySelector(".vm-share-height").value = defaultHeight(block)
      renderSnippet()
      renderLinks()
      dialog.showModal()
    }

    document.addEventListener("DOMContentLoaded", () => {
      const blocks = document.querySelectorAll("#quarto-document-content .vm-app")
      for (const block of blocks) {
        const bar = document.createElement("div")
        bar.className = "vm-share-bar"
        const button = document.createElement("button")
        button.type = "button"
        button.className = "vm-share-button"
        button.setAttribute("aria-haspopup", "dialog")
        button.textContent = "Share"
        button.addEventListener("click", () => openDialogFor(block))
        bar.appendChild(button)
        block.insertBefore(bar, block.firstChild)
      }
    })
  }

  // VML, not VM: VM is the mathviz library's namespace, and mathviz is
  // published to other sites that have never heard of this file. Merging
  // into VM.ui would put a site-local function where a library function is
  // expected, and the day mathviz grows an embedSrc of its own one of the
  // two would silently win (this script loads after the extension, so it
  // would be this one). A separate global keeps the boundary the same in
  // the code as it is in the repo.
  globalThis.VML = {...globalThis.VML, share: {siteRelativePath, embedSrc, pageUrl, buildEmbedSnippet}}
})(window)
