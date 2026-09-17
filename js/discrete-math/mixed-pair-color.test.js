/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { pairColor } = VM.discreteMath

test('pairColor returns the correct shared color for each mixed pair, order-independent', () => {
  // Light-theme values (the test stub has no body, so isDark() is false):
  // warn, accent3 and accent2 from js/plotting/chart-theme.js at 0.8.
  const gold = 'rgba(245, 158, 11, 0.8)'
  const teal = 'rgba(13, 148, 136, 0.8)'
  const orchid = 'rgba(147, 51, 234, 0.8)'
  assert.equal(gold, VM.plotting.alpha('warn', 0.8))
  assert.equal(teal, VM.plotting.alpha('accent3', 0.8))
  assert.equal(orchid, VM.plotting.alpha('accent2', 0.8))
  const cases = [
    ['red', 'green', gold],
    ['green', 'red', gold],
    ['green', 'blue', teal],
    ['blue', 'green', teal],
    ['red', 'blue', orchid],
    ['blue', 'red', orchid],
  ]
  for (const [a, b, expected] of cases) {
    assert.equal(pairColor(a, b), expected, `pairColor(${a}, ${b})`)
  }
})

test('pairColor uses hues distinct from the three vertex colors', () => {
  const vertexColors = new Set([VM.discreteMath.vertexColor('red'), VM.discreteMath.vertexColor('green'), VM.discreteMath.vertexColor('blue')])
  for (const [a, b] of [['red', 'green'], ['green', 'blue'], ['red', 'blue']]) {
    const rgb = pairColor(a, b).replace(/rgba\((\d+), (\d+), (\d+), [\d.]+\)/, (m, r, g, bl) => '#' + [r, g, bl].map(v => Number(v).toString(16).padStart(2, '0')).join(''))
    assert.ok(!vertexColors.has(rgb), `pairColor(${a}, ${b}) collides with a vertex color`)
  }
})

test('pairColor returns null when both colors match', () => {
  for (const color of ['red', 'green', 'blue']) {
    assert.equal(pairColor(color, color), null)
  }
})
