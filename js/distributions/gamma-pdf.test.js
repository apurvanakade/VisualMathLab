/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { gammaPdf } = VM.distributions

test('gammaPdf(x, 1, rate) matches the exponential density', () => {
  const rate = 1.7
  for (const x of [0.1, 1, 3]) {
    assert.ok(Math.abs(gammaPdf(x, 1, rate) - rate * Math.exp(-rate * x)) < 1e-9)
  }
})

test('gammaPdf integrates to approximately 1, including for a half-integer shape', () => {
  for (const shape of [2, 3.5, 10]) {
    const rate = 1
    const step = 0.005
    let integral = 0
    for (let x = step; x < 80; x += step) integral += gammaPdf(x, shape, rate) * step
    assert.ok(Math.abs(integral - 1) < 0.01, `shape=${shape}: expected integral near 1, got ${integral}`)
  }
})

test('gammaPdf is 0 for non-positive x or non-positive parameters', () => {
  assert.equal(gammaPdf(0, 2, 1), 0)
  assert.equal(gammaPdf(-1, 2, 1), 0)
  assert.equal(gammaPdf(1, 0, 1), 0)
})
