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

// split.js is this site's own chrome (see _includes/chrome.html): an
// IIFE evaluated in global scope against a minimal document stub that is
// still loading, so init() waits on a DOMContentLoaded this stub never
// fires and only the pure helpers are exercised.
globalThis.window = globalThis
globalThis.document = { readyState: 'loading', addEventListener: () => {} }
const here = path.dirname(fileURLToPath(import.meta.url))
;(0, eval)(fs.readFileSync(path.join(here, '../_chrome/split.js'), 'utf8'))
const { clampWidth, chartHeight } = globalThis.VM.chrome.split

test('clampWidth keeps a width that leaves both sides room', () => {
  assert.equal(clampWidth(700.4, 1440), 700)
})

test('clampWidth holds the pane at its minimum', () => {
  assert.equal(clampWidth(100, 1440), 480)
})

test('clampWidth leaves the text column its minimum', () => {
  assert.equal(clampWidth(1400, 1440), 1440 - 320)
})

test('clampWidth gives way to the pane minimum in a narrow window', () => {
  assert.equal(clampWidth(600, 700), 480)
})

test('clampWidth takes other minimums', () => {
  assert.equal(clampWidth(100, 1440, { minApp: 300 }), 300)
  assert.equal(clampWidth(1400, 1440, { minText: 500 }), 940)
})

test('clampWidth rejects a non-number, such as an unreadable stored value', () => {
  assert.equal(clampWidth(Number('wide'), 1440), null)
  assert.equal(clampWidth(Infinity, 1440), null)
})

test('chartHeight shares what the controls leave equally', () => {
  // A 800px pane holding 300px of controls and two charts now 200px each.
  assert.equal(chartHeight({ paneHeight: 800, contentHeight: 700, chartsHeight: 400, charts: 2 }), 250)
})

test('chartHeight lets a chart that came out too tall shrink back', () => {
  assert.equal(chartHeight({ paneHeight: 800, contentHeight: 1500, chartsHeight: 1200, charts: 1 }), 500)
})

test('chartHeight is null with no charts', () => {
  assert.equal(chartHeight({ paneHeight: 800, contentHeight: 300, chartsHeight: 0, charts: 0 }), null)
})
