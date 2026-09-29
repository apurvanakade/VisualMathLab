/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { persistentPlot } = VM.plotting

test('persistentPlot creates the div once, then reacts on the same div', () => {
  const calls = []
  globalThis.Plotly.newPlot = (div) => calls.push(['newPlot', div])
  globalThis.Plotly.react = (div) => calls.push(['react', div])
  globalThis.document.createElement = () => ({className: '', style: {}})
  const originalAutoResize = VM.plotting.autoResize
  VM.plotting.autoResize = () => {}

  const plot = persistentPlot({height: '300px'})
  const first = plot([], {})
  const second = plot([], {})

  assert.equal(first, second)
  assert.equal(first.className, 'plotly-box-large')
  assert.equal(first.style.height, '300px')
  assert.deepEqual(calls.map((c) => c[0]), ['newPlot', 'react'])
  VM.plotting.autoResize = originalAutoResize
})
