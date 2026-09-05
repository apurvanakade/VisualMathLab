/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 (pure-logic, no browser) regression tests for the analytics/consent
// wiring described in CLAUDE.md's "Analytics and consent" section:
//   - _includes/analytics.html: the vendored minimal GA4 snippet, plus this
//     project's local patches (tid, localhost guard, DNT/GPC guard, no
//     query string in `dl`, empty searchKeys).
//   - _includes/consent.html: the consent gate and banner.
//
// This file checks two different things:
//   1. Structural invariants on the file contents -- cheap regression guards
//      against a re-vendor of analytics.html silently dropping one of the
//      LOCAL patches (see that file's own header comment for the list).
//   2. The snippet's actual runtime behavior, executed via indirect eval
//      against a stubbed DOM/localStorage/navigator (same technique
//      load-vm.mjs uses for js/**), so this exercises the real shipped code,
//      not a re-implementation of it.
//
// A real browser is needed to test the consent *gate* itself (a `text/plain`
// script only fails to execute inside an actual browser) -- that is covered
// by the Tier 2 `scripts/verify-analytics.mjs` instead.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const analyticsHtml = fs.readFileSync(path.join(repoRoot, '_includes/analytics.html'), 'utf8')
const consentHtml = fs.readFileSync(path.join(repoRoot, '_includes/consent.html'), 'utf8')

function extractScript(html) {
  // Matched narrowly (not just <script ...>) because this file's own header
  // comment mentions the bare literal "<script>" in prose, which a looser
  // regex would match instead of the real tag.
  const match = html.match(/<script type="text\/plain" data-consent="analytics">([\s\S]*?)<\/script>/)
  assert.ok(match, 'expected to find the gated analytics <script> block')
  return match[1]
}

// -----------------------------------------------------------------------
// 1. Structural invariants
// -----------------------------------------------------------------------

test('analytics.html: is gated as an inert script, not a live one', () => {
  assert.match(
    analyticsHtml,
    /<script type="text\/plain" data-consent="analytics">/,
    'the snippet must ship as a text/plain script so no browser executes it until consent.html re-creates it -- this is the entire consent gate'
  )
})

test('analytics.html: tid is this site\'s GA4 measurement ID', () => {
  assert.match(analyticsHtml, /tid:"G-76ZBFD9S9B"/)
})

test('analytics.html: searchKeys is empty', () => {
  // Upstream's default searchKeys (["q","s","search","query","keyword"])
  // would misreport apps/butcher-tableau's "?s=" (a stage
  // count, not a search) as a view_search_results event -- see CLAUDE.md.
  assert.match(analyticsHtml, /searchKeys:\[\]/)
})

test('analytics.html: reported page location has no query string', () => {
  // A query string on this site is the visitor's own math input (function,
  // seed, initial guess), not a page identifier -- see CLAUDE.md.
  assert.match(analyticsHtml, /dl:i\.origin\+i\.pathname[,}]/)
  assert.doesNotMatch(analyticsHtml, /dl:i\.origin\+i\.pathname\+O/)
})

test('analytics.html: honors localhost, Do Not Track, and Global Privacy Control', () => {
  assert.match(analyticsHtml, /location\.hostname==="localhost"/)
  assert.match(analyticsHtml, /navigator\.doNotTrack==="1"/)
  assert.match(analyticsHtml, /navigator\.globalPrivacyControl===!0/)
})

test('analytics.html: sets no cookies', () => {
  assert.doesNotMatch(analyticsHtml, /document\.cookie/)
})

test('consent.html: sets no cookies either', () => {
  assert.doesNotMatch(consentHtml, /document\.cookie/)
})

test('consent.html: banner makes no false ads/personalization claims', () => {
  // The whole reason this hand-written banner exists instead of Quarto's
  // built-in cookie-consent library -- see that file's header comment,
  // which itself quotes the false claim being avoided, so this checks only
  // the visible banner markup, not the file's prose.
  const bannerMatch = consentHtml.match(/<div id="vml-consent"[\s\S]*?\n<\/div>\s*\n\s*\n<script>/)
  assert.ok(bannerMatch, 'expected to find the #vml-consent banner markup')
  assert.doesNotMatch(bannerMatch[0], /targeted ads|personalized content|advertising cookies/i)
})

test('consent.html: re-creates the gated script rather than mutating .type in place', () => {
  // Assigning to .type on the original <script> element would not execute
  // it -- a script only runs when it is inserted into the document.
  assert.match(consentHtml, /document\.createElement\("script"\)/)
})

// -----------------------------------------------------------------------
// 2. Runtime behavior of the analytics snippet, in a stubbed DOM
// -----------------------------------------------------------------------

function runSnippet(hostname, { search = '', privacySignal = null } = {}) {
  const store = new Map()
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() { return store.size },
    key: (i) => [...store.keys()][i],
  }
  const beacons = []
  const listeners = []
  const location = {
    hostname,
    origin: 'https://' + hostname,
    pathname: '/apps/butcher-tableau/',
    search,
  }
  const document = {
    title: 'Butcher Tableau',
    referrer: '',
    location,
    documentElement: { scrollHeight: 2000, clientHeight: 800, scrollTop: 0 },
    body: { scrollHeight: 2000, scrollTop: 0 },
    addEventListener: (t, f) => listeners.push([t, f]),
    removeEventListener: () => {},
  }
  const navigator = {
    language: 'en-US',
    sendBeacon: (u) => { beacons.push(u); return true },
    doNotTrack: privacySignal === 'dnt' ? '1' : undefined,
    globalPrivacyControl: privacySignal === 'gpc' ? true : undefined,
  }
  const screen = { width: 1512, height: 982 }
  const window = { doNotTrack: undefined }

  const code = extractScript(analyticsHtml)
  const fn = new Function(
    'localStorage', 'document', 'navigator', 'screen', 'location', 'window',
    'requestAnimationFrame', 'XMLHttpRequest',
    code
  )
  fn(localStorage, document, navigator, screen, location, window, (cb) => cb(), class {})
  return { beacons, listeners, store }
}

test('analytics snippet: does not run on localhost', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const { beacons } = runSnippet(host)
    assert.equal(beacons.length, 0, `expected no beacons on ${host}`)
  }
})

test('analytics snippet: does not run when DNT or GPC is set', () => {
  for (const signal of ['dnt', 'gpc']) {
    const { beacons } = runSnippet('www.visualmathlab.com', { privacySignal: signal })
    assert.equal(beacons.length, 0, `expected no beacons with ${signal} set`)
  }
})

test('analytics snippet: sends exactly one page_view on a real page, with correct params', () => {
  const { beacons, store } = runSnippet('www.visualmathlab.com', { search: '?s=4' })
  assert.equal(beacons.length, 1)

  const url = new URL(beacons[0])
  const params = url.searchParams
  assert.equal(params.get('tid'), 'G-76ZBFD9S9B')
  assert.equal(params.get('en'), 'page_view')
  assert.equal(params.get('dl'), 'https://www.visualmathlab.com/apps/butcher-tableau/')
  assert.equal(params.get('ep.search_term'), null, 'the "s" query param is a stage count here, not a search')
  assert.ok(store.get('cid_v4'), 'expected a client id to be generated and persisted')
})

test('analytics snippet: registers scroll, click, and visibilitychange listeners', () => {
  const { listeners } = runSnippet('www.visualmathlab.com')
  const types = listeners.map(([t]) => t).sort()
  assert.deepEqual(types, ['click', 'scroll', 'visibilitychange'])
})
