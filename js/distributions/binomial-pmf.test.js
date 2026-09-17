/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { binomialPmf } = VM.distributions

test('binomialPmf matches hand-computed values for n=2, p=0.5', () => {
  assert.ok(Math.abs(binomialPmf(0, 2, 0.5) - 0.25) < 1e-9)
  assert.ok(Math.abs(binomialPmf(1, 2, 0.5) - 0.5) < 1e-9)
  assert.ok(Math.abs(binomialPmf(2, 2, 0.5) - 0.25) < 1e-9)
})

test('binomialPmf sums to approximately 1, including for large n (no overflow)', () => {
  for (const n of [10, 300]) {
    let sum = 0
    for (let k = 0; k <= n; k++) sum += binomialPmf(k, n, 0.4)
    assert.ok(Math.abs(sum - 1) < 1e-6, `n=${n}: expected sum near 1, got ${sum}`)
  }
})

test('binomialPmf is 0 outside [0, n]', () => {
  assert.equal(binomialPmf(-1, 5, 0.5), 0)
  assert.equal(binomialPmf(6, 5, 0.5), 0)
})
