/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { studentTPdf } = VM.distributions

test('studentTPdf is symmetric about 0', () => {
  for (const x of [0.5, 1, 2.3]) {
    assert.ok(Math.abs(studentTPdf(x, 5) - studentTPdf(-x, 5)) < 1e-9)
  }
})

test('studentTPdf integrates to approximately 1', () => {
  for (const k of [1, 5, 30]) {
    const step = 0.01
    let integral = 0
    for (let x = -60; x < 60; x += step) integral += studentTPdf(x, k) * step
    assert.ok(Math.abs(integral - 1) < 0.02, `k=${k}: expected integral near 1, got ${integral}`)
  }
})

test('studentTPdf approaches the standard normal density for large k', () => {
  const k = 5000
  for (const x of [0, 1, 2]) {
    const normalPdf = Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI)
    assert.ok(Math.abs(studentTPdf(x, k) - normalPdf) < 0.01, `x=${x}: expected near ${normalPdf}, got ${studentTPdf(x, k)}`)
  }
})
