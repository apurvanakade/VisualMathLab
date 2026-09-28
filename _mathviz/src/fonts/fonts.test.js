/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Regression tests for the self-hosted fonts `mathviz: {fonts: true}` adds
// (see fonts.css's header comment and the fonts block in mathviz.lua).
//
// Every failure this guards against is silent: the page still renders, the
// layout still works, and the whole site just quietly falls back to system
// fonts. Nothing throws, so neither `quarto render` nor a browser crawl's
// error-console check would notice -- which is exactly why these are asserted
// on the files' contents instead.
//
// One of them is also a privacy claim a consuming site may make: that no
// font request goes to Google, and therefore that no third party is handed
// the visitor's IP address before consent is asked for.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fontsDir = path.dirname(fileURLToPath(import.meta.url))
const mathvizLua = fs.readFileSync(path.join(fontsDir, '../../_extensions/mathviz/mathviz.lua'), 'utf8')
const fontsCss = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8')

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

test('mathviz.lua ships every woff2 beside fonts.css', () => {
  // fonts.css names each file by bare name, so each has to be copied into
  // the same site_libs folder as the stylesheet. The filter lists the folder
  // at render time rather than naming files, so a refresh that renames them
  // needs no Lua edit -- this pins that it still does, and with the prefix
  // that keeps the files next to the stylesheet.
  assert.match(mathvizLua, /stylesheets = \{ "fonts\/fonts\.css" \}/)
  assert.match(mathvizLua, /list_directory\(quarto\.utils\.resolve_path\("fonts"\)\)/)
  assert.match(mathvizLua, /name:match\("%\.woff2\$"\)/)
  assert.match(mathvizLua, /"fonts\/" \.\. name/)
})

test('fonts are opt-in', () => {
  // A site with its own typography shouldn't carry ~400kB it never loads.
  assert.match(mathvizLua, /option\(meta, "fonts", false\) == true/)
})
