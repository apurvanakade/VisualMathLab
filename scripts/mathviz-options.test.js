/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) test for where mathviz options are set.
// They live in _quarto.yml's mathviz: block; a page that needs one of its
// own sets it under mathviz-page:. A page-level mathviz: doesn't add to the
// project's block, it replaces it (Quarto merges front matter key by key
// only for keys it knows), so the page silently loses the referrer meta,
// fonts, sidebar rail and everything else -- the homepage did, from
// mathviz v0.10.0's category cloud until this test. Nothing throws and the
// page still renders, so no other check notices.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Every tracked .qmd outside the generated docs/ and the installed
// extension, apps/_template/ included (new pages are copied from it).
function sourcePages () {
  return execFileSync('git', ['ls-files', '*.qmd'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file && !file.startsWith('docs/') && !file.startsWith('_extensions/'))
}

function frontMatter (source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  return match ? match[1] : ''
}

test('no page sets mathviz: in its front matter (use mathviz-page:)', () => {
  const pages = sourcePages()
  assert.ok(pages.length > 0, 'git ls-files found no .qmd pages')
  for (const file of pages) {
    const yaml = frontMatter(fs.readFileSync(path.join(repoRoot, file), 'utf8'))
    assert.doesNotMatch(yaml, /^mathviz:/m,
      `${file}: a page-level mathviz: replaces _quarto.yml's whole block; use mathviz-page:`)
  }
})

test('_quarto.yml sets the mathviz: block the pages inherit', () => {
  const config = fs.readFileSync(path.join(repoRoot, '_quarto.yml'), 'utf8')
  assert.match(config, /^mathviz:$/m)
})
