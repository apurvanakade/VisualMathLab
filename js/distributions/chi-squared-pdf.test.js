/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { chiSquaredPdf } = VM.distributions

test('chiSquaredPdf(x, 2) matches Exponential(0.5), the k=2 special case', () => {
  for (const x of [0.5, 1, 3]) {
    assert.ok(Math.abs(chiSquaredPdf(x, 2) - 0.5 * Math.exp(-0.5 * x)) < 1e-9)
  }
})

test('chiSquaredPdf integrates to approximately 1 for both even and odd k', () => {
  for (const k of [3, 4, 7]) {
    const step = 0.005
    let integral = 0
    for (let x = step; x < 100; x += step) integral += chiSquaredPdf(x, k) * step
    assert.ok(Math.abs(integral - 1) < 0.01, `k=${k}: expected integral near 1, got ${integral}`)
  }
})
