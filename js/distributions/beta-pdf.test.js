/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { betaPdf } = VM.distributions

test('betaPdf(x, 1, 1) is exactly 1 everywhere on (0, 1) -- the Uniform(0,1) special case', () => {
  for (const x of [0.01, 0.3, 0.5, 0.7, 0.99]) {
    assert.ok(Math.abs(betaPdf(x, 1, 1) - 1) < 1e-9)
  }
})

test('betaPdf integrates to approximately 1', () => {
  for (const [a, b] of [[2, 3], [1, 1], [5, 5]]) {
    const step = 0.0005
    let integral = 0
    for (let x = step; x < 1; x += step) integral += betaPdf(x, a, b) * step
    assert.ok(Math.abs(integral - 1) < 0.02, `a=${a},b=${b}: expected integral near 1, got ${integral}`)
  }
})

test('betaPdf is 0 outside (0, 1)', () => {
  assert.equal(betaPdf(0, 2, 2), 0)
  assert.equal(betaPdf(1, 2, 2), 0)
  assert.equal(betaPdf(1.5, 2, 2), 0)
})
