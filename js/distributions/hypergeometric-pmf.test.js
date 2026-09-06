/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { hypergeometricPmf } = VM.distributions

test('hypergeometricPmf matches a hand-computed case', () => {
  // N = 10, K = 4 successes, n = 3 draws, k = 2:
  // C(4,2) C(6,1) / C(10,3) = 6*6/120 = 0.3
  assert.ok(Math.abs(hypergeometricPmf(2, 10, 4, 3) - 0.3) < 1e-12)
})

test('hypergeometricPmf sums to 1 over its support', () => {
  let sum = 0
  for (let k = 0; k <= 12; k++) sum += hypergeometricPmf(k, 50, 12, 8)
  assert.ok(Math.abs(sum - 1) < 1e-10)
})

test('hypergeometricPmf has mean n K / N', () => {
  const N = 40, K = 15, n = 9
  let mean = 0
  for (let k = 0; k <= n; k++) mean += k * hypergeometricPmf(k, N, K, n)
  assert.ok(Math.abs(mean - n * K / N) < 1e-10)
})

test('hypergeometricPmf is 0 where the draw is impossible', () => {
  // Cannot draw 5 successes when only 4 exist.
  assert.equal(hypergeometricPmf(5, 10, 4, 6), 0)
  // With 8 draws from 10 items of which 4 are failures, at least 4 are successes.
  assert.equal(hypergeometricPmf(3, 10, 6, 8), 0)
})
