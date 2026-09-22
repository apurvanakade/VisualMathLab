/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

// The patch has to survive a page with no Plotly at all -- the library also
// serves pages that draw with D3 or a canvas -- and must not double-wrap
// newPlot when asked twice (once at load, once on DOMContentLoaded).

test('loads without Plotly and reports the patch as not installed', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  assert.equal(VM.plotting.installPlotlyPatch(), false)
  assert.equal(typeof VM.plotting.fullscreenButton, 'object')
})

test('patches newPlot/react once Plotly exists, and only once', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = []
  const original = (gd, data, layout, config) => calls.push({ data, layout, config })
  globalThis.Plotly = { newPlot: original, react: original, Icons: { zoom_plus: {}, zoom_minus: {} } }

  assert.equal(VM.plotting.installPlotlyPatch(), true)
  const patched = globalThis.Plotly.newPlot
  assert.notEqual(patched, original)
  assert.equal(VM.plotting.installPlotlyPatch(), true, 'second call is a no-op')
  assert.equal(globalThis.Plotly.newPlot, patched, 'must not wrap the wrapper')

  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.document.body = { matches: () => false }
  globalThis.Plotly.newPlot({}, [{ x: [1], y: [2] }], { xaxis: { title: 'x' } }, {})
  assert.equal(calls.length, 1)
  const [{ data, layout, config }] = calls
  assert.equal(layout.xaxis.title, 'x', "the page's own layout survives")
  assert.equal(layout.dragmode, 'pan')
  assert.equal(layout.paper_bgcolor, 'rgba(0,0,0,0)', 'the shared theme is layered underneath')
  assert.ok(data[0].hoverlabel, 'the themed hoverlabel is injected per trace')
  assert.ok(Array.isArray(config.modeBarButtons))
  assert.equal(config.modeBarButtons.at(-1)[0], VM.plotting.fullscreenButton)
})
