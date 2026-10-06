/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Helpers shared by the opt-in site chrome (share.js, report-bug.js), loaded
// ahead of either as a dependency of its own -- the filter adds it whenever
// one of them is on, and Quarto emits a dependency once however many ask
// for it. Not in the always-loaded mathviz.js: a site that turns none of
// the chrome on never needs these.
(function attachChrome(globalThis) {
  // The page's path relative to the site root, which is what a public URL
  // or a source path needs. location.pathname alone isn't: served from
  // anywhere but the site root (a local server over the repo, where it reads
  // /docs/apps/..., or a GitHub Pages project site under /<repo>/) it carries
  // a prefix. `offset` is Quarto's quarto:offset meta -- the relative path
  // from this page back to the root ("../../" for an app page) -- so
  // resolving it against the page gives the root as served, and everything
  // after that is the site-relative path.
  const siteRelativePath = ({ href, offset }) => {
    const pathname = new URL(href).pathname
    if (!offset) return pathname
    const root = new URL(offset, href).pathname
    if (!pathname.startsWith(root)) return pathname
    return "/" + pathname.slice(root.length)
  }

  // The content of <meta name="<name>">, or null. The filter passes each
  // chrome option to the page this way (see mathviz.lua), so the scripts
  // need no build-time templating.
  const meta = (name) => {
    const el = document.querySelector(`meta[name="${name}"]`)
    if (el === null) return null
    return el.getAttribute("content")
  }

  // This page's siteRelativePath, as served right now.
  const currentSitePath = () => siteRelativePath({
    href: globalThis.location.href,
    offset: meta("quarto:offset")
  })

  const VM = globalThis.VM || (globalThis.VM = {})
  VM.chrome = { ...VM.chrome, siteRelativePath, meta, currentSitePath }
})(window)
