/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { fPdf } = VM.distributions

test('fPdf integrates to approximately 1', () => {
  for (const [d1, d2] of [[3, 8], [10, 10], [1, 20]]) {
    const step = 0.001
    let integral = 0
    for (let x = step; x < 40; x += step) integral += fPdf(x, d1, d2) * step
    assert.ok(Math.abs(integral - 1) < 0.02, `d1=${d1},d2=${d2}: expected integral near 1, got ${integral}`)
  }
})

test('fPdf is 0 for non-positive x or parameters', () => {
  assert.equal(fPdf(0, 4, 4), 0)
  assert.equal(fPdf(-1, 4, 4), 0)
})
