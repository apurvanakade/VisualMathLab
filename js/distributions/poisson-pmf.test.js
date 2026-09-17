/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { poissonPmf } = VM.distributions

test('poissonPmf(0, lambda) equals exp(-lambda)', () => {
  assert.ok(Math.abs(poissonPmf(0, 3) - Math.exp(-3)) < 1e-9)
})

test('poissonPmf sums to approximately 1 over enough of its support', () => {
  const lambda = 8
  let sum = 0
  for (let k = 0; k <= 200; k++) sum += poissonPmf(k, lambda)
  assert.ok(Math.abs(sum - 1) < 1e-6, `expected sum near 1, got ${sum}`)
})

test('poissonPmf is 0 for negative or non-integer k', () => {
  assert.equal(poissonPmf(-1, 3), 0)
  assert.equal(poissonPmf(1.5, 3), 0)
})
