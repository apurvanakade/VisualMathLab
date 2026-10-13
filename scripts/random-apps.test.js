/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) test for the homepage's "Random app"
// list. That list is written out by hand in index.qmd's <script>, because
// the Gallery listing is paginated after load and can't be read from the
// DOM, so nothing adds a new app to it automatically. A missing app is
// silent: it just never gets picked (Particle Filter Tracking went
// unlisted this way). This checks the list against apps/*/index.qmd.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = path.join(repoRoot, 'apps')
const indexQmd = fs.readFileSync(path.join(repoRoot, 'index.qmd'), 'utf8')

// One front-matter field, with its surrounding quotes removed.
function frontMatterField (source, field) {
  const frontMatter = source.split(/^---$/m)[1]
  const match = frontMatter.match(new RegExp(`^${field}: (.*)$`, 'm'))
  if (match === null) {
    return null
  }
  let value = match[1].trim()
  if (/^(["']).*\1$/.test(value)) {
    value = value.slice(1, -1)
  }
  return value
}

// Every rendered app page: Quarto skips folders starting with an underscore
// (apps/_template), so they aren't apps on the site.
function siteApps () {
  const apps = new Map()
  for (const slug of fs.readdirSync(appsDir).sort()) {
    const file = path.join(appsDir, slug, 'index.qmd')
    if (slug.startsWith('_') || !fs.existsSync(file)) {
      continue
    }
    const source = fs.readFileSync(file, 'utf8')
    apps.set(slug, {
      title: frontMatterField(source, 'title'),
      description: frontMatterField(source, 'description')
    })
  }
  return apps
}

// The {slug, title, description} entries of index.qmd's `var apps = [...]`.
function randomApps () {
  const block = indexQmd.match(/var apps = \[([\s\S]*?)\n\s*\]/)
  assert.ok(block, 'index.qmd no longer has a `var apps = [...]` list')
  const entries = []
  const entryPattern = /\{slug: "([^"]*)",\s*title: "([^"]*)",\s*description: "([^"]*)"\}/g
  for (const match of block[1].matchAll(entryPattern)) {
    entries.push({ slug: match[1], title: match[2], description: match[3] })
  }
  return entries
}

test('the Random app list names every app exactly once', () => {
  const apps = siteApps()
  const listed = randomApps()
  const slugs = []
  for (const entry of listed) {
    slugs.push(entry.slug)
  }

  const missing = []
  for (const slug of apps.keys()) {
    if (!slugs.includes(slug)) {
      missing.push(slug)
    }
  }
  assert.deepEqual(missing, [], 'apps missing from the Random app list in index.qmd')

  const unknown = []
  for (const slug of slugs) {
    if (!apps.has(slug)) {
      unknown.push(slug)
    }
  }
  assert.deepEqual(unknown, [], 'Random app entries with no apps/<slug>/index.qmd')

  assert.equal(new Set(slugs).size, slugs.length, 'an app is listed twice')
})

test('each Random app entry matches its page title and description', () => {
  const apps = siteApps()
  for (const entry of randomApps()) {
    const page = apps.get(entry.slug)
    if (page === undefined) {
      continue
    }
    assert.equal(entry.title, page.title, `${entry.slug}: title differs from its front matter`)
    assert.equal(entry.description, page.description, `${entry.slug}: description differs from its front matter`)
  }
})
