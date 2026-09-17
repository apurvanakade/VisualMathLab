/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { sampleCurve } = VM.distributions

test('sampleCurve returns n points spanning [lo, hi] inclusive', () => {
  const { xs, ys } = sampleCurve(x => 2 * x, 0, 10, { n: 5 })
  assert.deepEqual(xs, [0, 2.5, 5, 7.5, 10])
  assert.deepEqual(ys, [0, 5, 10, 15, 20])
})

test('sampleCurve defaults to 400 points', () => {
  const { xs } = sampleCurve(x => x, -1, 1)
  assert.equal(xs.length, 400)
  assert.equal(xs[0], -1)
  assert.equal(xs[399], 1)
})

test('sampleCurve discrete mode evaluates at each integer in the range', () => {
  const { xs, ys } = sampleCurve(k => k * k, -1.5, 3.2, { discrete: true })
  assert.deepEqual(xs, [-1, 0, 1, 2, 3])
  assert.deepEqual(ys, [1, 0, 1, 4, 9])
})

test('sampleCurve discrete mode can be empty when no integer falls in range', () => {
  const { xs, ys } = sampleCurve(k => k, 0.2, 0.8, { discrete: true })
  assert.deepEqual(xs, [])
  assert.deepEqual(ys, [])
})
