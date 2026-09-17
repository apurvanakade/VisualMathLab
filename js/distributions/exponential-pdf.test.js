/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { exponentialPdf } = VM.distributions

test('exponentialPdf(0, rate) equals rate, and is 0 for negative x', () => {
  assert.equal(exponentialPdf(0, 2), 2)
  assert.equal(exponentialPdf(-1, 2), 0)
})

test('exponentialPdf integrates to approximately 1', () => {
  const rate = 1.5
  const step = 0.001
  let integral = 0
  for (let x = 0; x < 30; x += step) integral += exponentialPdf(x, rate) * step
  assert.ok(Math.abs(integral - 1) < 0.01, `expected integral near 1, got ${integral}`)
})
