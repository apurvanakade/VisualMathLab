/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) regression tests for the self-hosted fonts
// described in fonts/fonts.css's header comment and in CLAUDE.md's theme
// section.
//
// Every failure this guards against is silent: the page still renders, the
// layout still works, and the whole site just quietly falls back to system
// fonts. Nothing throws, so neither `quarto render` nor the Tier 2 crawl's
// error-console check would notice -- which is exactly why these are asserted
// on the file's contents instead.
//
// Two of them are also privacy claims that privacy.qmd makes in prose: that
// no font request goes to Google, and therefore that no third party is handed
// the visitor's IP address before consent is asked for.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const fontsDir = path.join(repoRoot, 'fonts')

const fontsCss = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8')
const headScriptsHtml = fs.readFileSync(path.join(repoRoot, '_includes/head-scripts.html'), 'utf8')
const quartoYml = fs.readFileSync(path.join(repoRoot, '_quarto.yml'), 'utf8')
const privacyQmd = fs.readFileSync(path.join(repoRoot, 'privacy.qmd'), 'utf8')

// Strip comments first: the header comment quotes the broken
// `url(/fonts/inter-v20-latin.woff2)` spelling as the example of what not to
// write, and quotes the Google Fonts css2 URL the files were fetched from.
// Both would fail the assertions below if they were read as live rules.
const rules = fontsCss.replace(/\/\*[\s\S]*?\*\//g, '')

const urls = []
for (const m of rules.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) urls.push(m[1].trim())

test('fonts.css actually declares some faces to guard', () => {
  // A sanity check on the parsing above, so that a fonts.css that stopped
  // matching this shape would fail loudly here rather than make every
  // assertion below vacuously pass over an empty list.
  const faceCount = (rules.match(/@font-face/g) || []).length
  assert.ok(faceCount >= 10, `expected at least 10 @font-face blocks, found ${faceCount}`)
  assert.equal(urls.length, faceCount, 'every @font-face block should carry exactly one url()')
})

test('every url() is a bare relative file name, not root-relative', () => {
  // The bug this exists for: Quarto rewrites a root-relative url() inside a
  // project resource when it copies the file into docs/, and gets it wrong --
  // `url(/fonts/inter-v20-latin.woff2)` came out as
  // `url(..fonts/inter-v20-latin.woff2)`, a 404 on every page of the site.
  for (const url of urls) {
    assert.ok(!url.startsWith('/'), `root-relative url() will be rewritten wrong by Quarto: ${url}`)
    assert.ok(!url.startsWith('./') && !url.startsWith('../'), `url() should be a bare file name: ${url}`)
    assert.ok(!/^[a-z]+:/i.test(url), `url() should be a local file, not a remote one: ${url}`)
    assert.match(url, /^[\w.-]+\.woff2$/, `url() should be a plain woff2 file name: ${url}`)
  }
})

test('every url() names a file that is actually in fonts/', () => {
  for (const url of urls) {
    assert.ok(fs.existsSync(path.join(fontsDir, url)), `fonts.css references a missing file: fonts/${url}`)
  }
})

test('every woff2 in fonts/ is referenced by fonts.css', () => {
  // The other direction: an orphaned file is 400kB of repo and of published
  // site that nothing can ever load, usually left behind by a refresh that
  // bumped the -v<version> in the file names.
  const referenced = new Set(urls)
  for (const file of fs.readdirSync(fontsDir)) {
    if (!file.endsWith('.woff2')) continue
    assert.ok(referenced.has(file), `fonts/${file} is not referenced by fonts.css`)
  }
})

test('fonts.css makes no request to Google, which privacy.qmd promises', () => {
  // Self-hosting is the whole point of this folder: a Google Fonts request
  // hands Google every visitor's IP address before consent is asked for.
  assert.ok(!/fonts\.googleapis\.com/.test(rules), 'fonts.css must not link Google Fonts')
  assert.ok(!/fonts\.gstatic\.com/.test(rules), 'fonts.css must not fetch from fonts.gstatic.com')
})

test('no include pulls in Google Fonts either', () => {
  for (const name of fs.readdirSync(path.join(repoRoot, '_includes'))) {
    const body = fs.readFileSync(path.join(repoRoot, '_includes', name), 'utf8')
    assert.ok(!/fonts\.googleapis\.com/.test(body), `_includes/${name} must not link Google Fonts`)
    assert.ok(!/fonts\.gstatic\.com/.test(body), `_includes/${name} must not fetch from fonts.gstatic.com`)
  }
})

test('privacy.qmd still states that no font request goes to Google', () => {
  // The claim the tests above make true. If the wording here is reworked,
  // keep a sentence that names Google and fonts together, so the two files
  // stay cross-checked.
  assert.match(privacyQmd, /font/i)
  assert.ok(/Google/.test(privacyQmd), 'privacy.qmd should still address Google Fonts')
})

test('head-scripts.html links the stylesheet', () => {
  // Nothing else references fonts.css -- it is not a Quarto theme file, so an
  // unlinked stylesheet is simply never loaded.
  assert.match(headScriptsHtml, /<link[^>]+href="\/fonts\/fonts\.css"/)
})

test('_quarto.yml copies fonts/ into the rendered site', () => {
  // fonts.css is referenced only from head-scripts.html, which Quarto does
  // not scan for resources -- without this entry the folder never reaches
  // docs/ and every woff2 404s in production while working locally.
  assert.match(quartoYml, /^\s*-\s*fonts\/?\s*$/m)
})
