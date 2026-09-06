/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { geometricPmf } = VM.distributions

test('geometricPmf matches the closed form at small k', () => {
  const p = 0.4
  assert.ok(Math.abs(geometricPmf(1, p) - p) < 1e-12)
  assert.ok(Math.abs(geometricPmf(2, p) - (1 - p) * p) < 1e-12)
})

test('geometricPmf sums to approximately 1 over its support', () => {
  const p = 0.3
  let sum = 0
  for (let k = 1; k <= 500; k++) sum += geometricPmf(k, p)
  assert.ok(Math.abs(sum - 1) < 1e-6)
})

test('geometricPmf is 0 outside its support', () => {
  assert.equal(geometricPmf(0, 0.3), 0)
  assert.equal(geometricPmf(1.5, 0.3), 0)
})
