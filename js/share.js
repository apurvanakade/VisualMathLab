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

    let dialog = null
    let activeBlock = null
    let copyResetId = null

    const currentSnippet = () => {
      const keepInputs = dialog.querySelector(".vm-share-keep-inputs").checked
      const height = dialog.querySelector(".vm-share-height").value || "900"
      const blockId = activeBlock.id || ""
      const src = embedSrc({
        pathname: location.pathname,
        search: location.search,
        blockId,
        keepInputs
      })
      return buildEmbedSnippet({ src, height, title: pageTitle() })
    }

    const renderSnippet = () => {
      dialog.querySelector(".vm-share-code").value = currentSnippet()
    }

    const buildDialog = () => {
      const el = document.createElement("dialog")
      el.className = "vm-share-dialog"
      el.innerHTML = `
        <form method="dialog" class="vm-share-form">
          <h2>Embed this app</h2>
          <p>Paste this into another page to show the app alone, as an
          <code>&lt;iframe&gt;</code>. See <a href="/embed.html">Embedding an app</a>
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

        if (globalThis.navigator?.clipboard?.writeText) {
          globalThis.navigator.clipboard.writeText(text).then(showCopied).catch(fallbackSelect)
        } else {
          fallbackSelect()
        }
      })

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
  globalThis.VML = {...globalThis.VML, share: {embedSrc, buildEmbedSnippet}}
})(window)
