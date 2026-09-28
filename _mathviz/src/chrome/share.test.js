/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// share.js is one of mathviz's opt-in chrome scripts (see mathviz.lua): an
// IIFE evaluated in global scope against a minimal window/document stub,
// after site.js, which it reads VM.chrome helpers from. Its DOM-building
// code only runs inside a DOMContentLoaded listener, which this stub's
// addEventListener never fires, so only the pure builders are exercised.
globalThis.window = globalThis
globalThis.document = { addEventListener: () => {}, documentElement: { classList: { contains: () => false } } }
const here = path.dirname(fileURLToPath(import.meta.url))
for (const name of ['site.js', 'share.js']) {
  ;(0, eval)(fs.readFileSync(path.join(here, name), 'utf8'))
}
const { embedSrc, pageUrl, buildEmbedSnippet } = globalThis.VM.chrome.share
const siteUrl = 'https://www.visualmathlab.com'

test('embedSrc points at the public site, not the page origin', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/', search: '', blockId: '', keepInputs: false })
  assert.match(src, /^https:\/\/www\.visualmathlab\.com\/apps\/newton-method\/\?/)
})

test('embedSrc normalizes an explicit index.html pathname', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/index.html', search: '', blockId: '', keepInputs: false })
  assert.match(src, /^https:\/\/www\.visualmathlab\.com\/apps\/newton-method\/\?/)
})

test('embedSrc defaults embed to 1 when no blockId is given', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/', search: '', blockId: '', keepInputs: false })
  assert.equal(new URL(src).searchParams.get('embed'), '1')
})

test('embedSrc uses the given blockId over the default', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/sperners-lemma-combinatorial-proof/', search: '', blockId: 'doors', keepInputs: false })
  assert.equal(new URL(src).searchParams.get('embed'), 'doors')
})

test('embedSrc drops the current inputs when keepInputs is false', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/', search: '?f=x%5E3-2&x0=1', blockId: '', keepInputs: false })
  const params = new URL(src).searchParams
  assert.equal(params.get('f'), null)
  assert.equal(params.get('x0'), null)
})

test('embedSrc keeps the current inputs when keepInputs is true', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/', search: '?f=x%5E3-2&x0=1', blockId: '', keepInputs: true })
  const params = new URL(src).searchParams
  assert.equal(params.get('f'), 'x^3-2')
  assert.equal(params.get('x0'), '1')
})

test('embedSrc replaces an embed param already present in the current search rather than duplicating it', () => {
  const src = embedSrc({ siteUrl, pathname: '/apps/newton-method/', search: '?f=x&embed=1', blockId: 'boundary', keepInputs: true })
  const params = new URL(src).searchParams
  assert.deepEqual(params.getAll('embed'), ['boundary'])
})

test('buildEmbedSnippet matches the shape documented in embed.qmd', () => {
  const snippet = buildEmbedSnippet({
    src: 'https://www.visualmathlab.com/apps/newton-method/?f=x%5E3-2&embed=1',
    height: 900,
    title: "Newton's Method"
  })
  assert.match(snippet, /^<iframe\n/)
  assert.match(snippet, /src="https:\/\/www\.visualmathlab\.com\/apps\/newton-method\/\?f=x%5E3-2&embed=1"/)
  assert.match(snippet, /width="100%" height="900" loading="lazy"/)
  assert.match(snippet, /title="Newton's Method"/)
  assert.match(snippet, /<\/iframe>$/)
})

test('buildEmbedSnippet escapes double quotes in the title', () => {
  const snippet = buildEmbedSnippet({
    src: 'https://www.visualmathlab.com/',
    height: 480,
    title: 'The "root" finder'
  })
  assert.match(snippet, /title="The &quot;root&quot; finder"/)
})

test('pageUrl keeps the current inputs when keepInputs is true', () => {
  const url = pageUrl({ siteUrl, pathname: '/apps/newton-method/', search: '?f=x%5E3-2&x0=1', keepInputs: true })
  assert.equal(url, 'https://www.visualmathlab.com/apps/newton-method/?f=x%5E3-2&x0=1')
})

test('pageUrl drops the inputs, and leaves no bare "?", when keepInputs is false', () => {
  const url = pageUrl({ siteUrl, pathname: '/apps/newton-method/index.html', search: '?f=x%5E3-2&x0=1', keepInputs: false })
  assert.equal(url, 'https://www.visualmathlab.com/apps/newton-method/')
})

test('pageUrl drops an embed param so the link opens the full page', () => {
  const url = pageUrl({ siteUrl, pathname: '/apps/newton-method/', search: '?f=x&embed=1', keepInputs: true })
  assert.equal(url, 'https://www.visualmathlab.com/apps/newton-method/?f=x')
})

test('embedSrc and pageUrl work under a project-site subpath', () => {
  const base = 'https://apurvanakade.github.io/Monte-Carlo-Methods'
  assert.equal(pageUrl({ siteUrl: base, pathname: '/apps/buffons-needle.html', search: '', keepInputs: false }),
    'https://apurvanakade.github.io/Monte-Carlo-Methods/apps/buffons-needle.html')
  assert.match(embedSrc({ siteUrl: base, pathname: '/apps/', search: '', blockId: '', keepInputs: false }),
    /^https:\/\/apurvanakade\.github\.io\/Monte-Carlo-Methods\/apps\/\?embed=1$/)
})
