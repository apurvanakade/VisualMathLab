/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { lagrangeQuadratic } = VM.numerical

test('lagrangeQuadratic exactly reproduces a known quadratic through 3 of its points', () => {
  const f = x => 2 * x * x - 3 * x + 1
  const { xs, ys } = lagrangeQuadratic(0, f(0), 1, f(1), 2, f(2), 8)
  assert.equal(xs.length, 9)
  for (let i = 0; i < xs.length; i++) {
    assert.ok(Math.abs(ys[i] - f(xs[i])) < 1e-10, `at x=${xs[i]}: got ${ys[i]}, expected ${f(xs[i])}`)
  }
})

test('lagrangeQuadratic passes through the three input points exactly', () => {
  const { xs, ys } = lagrangeQuadratic(0, 1, 1, 4, 2, 9, 4)
  assert.ok(Math.abs(xs[0] - 0) < 1e-10 && Math.abs(ys[0] - 1) < 1e-10)
  assert.ok(Math.abs(xs[xs.length - 1] - 2) < 1e-10 && Math.abs(ys[ys.length - 1] - 9) < 1e-10)
})
