/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) tests for this site's use of the mathviz
// fonts and theme. The font files themselves, and the Lua that ships them,
// are the library's and are tested next to them
// (src/fonts/fonts.test.js in apurvanakade/mathviz); what is left here is what this site
// claims: that it turns them on, and privacy.qmd's statement that no font
// request goes to Google.
//
// Every failure this guards against is silent -- the site just falls back
// to system fonts, or to Quarto's stock Bootstrap chrome -- so neither
// `quarto render` nor the Tier 2 crawl's error-console check would notice.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const quartoYml = fs.readFileSync(path.join(repoRoot, '_quarto.yml'), 'utf8')
const privacyQmd = fs.readFileSync(path.join(repoRoot, 'privacy.qmd'), 'utf8')

test('_quarto.yml turns on the self-hosted fonts', () => {
  // The mathviz theme names Inter and JetBrains Mono; without this option
  // nothing loads them, and every page silently falls back.
  assert.match(quartoYml, /^mathviz:\n(?:  .*\n)*?  fonts: true$/m)
})

test('_quarto.yml uses the mathviz theme, and the files it names exist', () => {
  for (const scheme of ['light', 'dark']) {
    const rel = `_extensions/apurvanakade/mathviz/theme/mathviz-${scheme}.scss`
    assert.match(quartoYml, new RegExp(`^\\s*${scheme}: \\[${rel.replace(/[./]/g, '\\$&')}`, 'm'))
    assert.ok(fs.existsSync(path.join(repoRoot, rel)), `${rel} is missing -- run scripts/update-mathviz.sh`)
  }
})

test('no include pulls in Google Fonts', () => {
  for (const name of fs.readdirSync(path.join(repoRoot, '_includes'))) {
    const body = fs.readFileSync(path.join(repoRoot, '_includes', name), 'utf8')
    assert.ok(!/fonts\.googleapis\.com/.test(body), `_includes/${name} must not link Google Fonts`)
    assert.ok(!/fonts\.gstatic\.com/.test(body), `_includes/${name} must not fetch from fonts.gstatic.com`)
  }
})

test('privacy.qmd still states that no font request goes to Google', () => {
  // The claim the tests above (and the library's) make true. If the wording
  // here is reworked, keep a sentence that names Google and fonts together,
  // so the two files stay cross-checked.
  assert.match(privacyQmd, /font/i)
  assert.ok(/Google/.test(privacyQmd), 'privacy.qmd should still address Google Fonts')
})
