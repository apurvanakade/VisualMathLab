/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) tests for how a page gets listed. Nothing
// is registered by hand: an app's `topic:` and `order:` place it in its
// topic page's listing (a glob filtered by topic), in the sidebar
// (_sidebar.yml, written by scripts/build-sidebar.mjs) and in the
// homepage's Random app (a listing rendered through random-apps.ejs). These
// check the pieces that front matter alone can't guarantee.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSidebar, frontMatterField } from './build-sidebar.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read (relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

// Rendered pages one level under dir (Quarto skips _-prefixed folders).
function slugs (dir) {
  const result = []
  for (const slug of fs.readdirSync(path.join(repoRoot, dir)).sort()) {
    if (slug.startsWith('_') || !fs.existsSync(path.join(repoRoot, dir, slug, 'index.qmd'))) {
      continue
    }
    result.push(slug)
  }
  return result
}

test('the committed _sidebar.yml is what build-sidebar.mjs generates', () => {
  // buildSidebar() also throws on an app whose topic: names no topic page.
  assert.equal(read('_sidebar.yml'), buildSidebar(),
    '_sidebar.yml is stale: run scripts/build-sidebar.mjs (any render does)')
})

test('every app has the title and description the Random app shows', () => {
  for (const slug of slugs('apps')) {
    const source = read(`apps/${slug}/index.qmd`)
    assert.ok(frontMatterField(source, 'title'), `apps/${slug}: no title:`)
    assert.ok(frontMatterField(source, 'description'), `apps/${slug}: no description:`)
  }
})

test('each topic page lists the apps whose topic: is its own title', () => {
  for (const slug of slugs('topics')) {
    const source = read(`topics/${slug}/index.qmd`)
    const title = frontMatterField(source, 'title')
    assert.match(source, /^ {2}contents: "\.\.\/\.\.\/apps\/\*\/index\.qmd"$/m,
      `topics/${slug}: listing should glob ../../apps/*/index.qmd`)
    assert.ok(source.includes(`  include:\n    topic: "${title}"\n`),
      `topics/${slug}: listing should include topic: "${title}"`)
  }
})

test('the homepage Random app reads the random-apps listing', () => {
  const index = read('index.qmd')
  assert.match(index, /- id: random-apps\n\s+contents: "\/apps\/\*\/index\.qmd"\n\s+template: random-apps\.ejs/)
  assert.ok(index.includes('::: {#random-apps}'), 'index.qmd: no #random-apps div for the listing')
  assert.ok(index.indexOf('::: {#random-apps}') < index.indexOf('getElementById("vm-random-apps")'),
    'the listing must come before the script that reads it, which runs as the page parses')
  assert.ok(read('random-apps.ejs').includes('id="vm-random-apps"'))
})
