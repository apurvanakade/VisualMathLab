/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { regularizedBetaI } = VM.distributions

test('regularizedBetaI(x, 1, 1) = x (Beta(1,1) is Uniform(0,1))', () => {
  for (const x of [0, 0.2, 0.5, 0.75, 1]) {
    assert.ok(Math.abs(regularizedBetaI(x, 1, 1) - x) < 1e-12, `failed at x=${x}`)
  }
})

test('regularizedBetaI(x, 2, 1) = x^2 and (x, 1, 2) = 2x - x^2', () => {
  for (const x of [0.1, 0.4, 0.9]) {
    assert.ok(Math.abs(regularizedBetaI(x, 2, 1) - x * x) < 1e-12, `pow2 failed at x=${x}`)
    assert.ok(Math.abs(regularizedBetaI(x, 1, 2) - (2 * x - x * x)) < 1e-12, `1,2 failed at x=${x}`)
  }
})

test('regularizedBetaI(0.5, a, a) = 1/2 by symmetry, and the endpoints clamp', () => {
  for (const a of [0.5, 1, 3, 12]) {
    assert.ok(Math.abs(regularizedBetaI(0.5, a, a) - 0.5) < 1e-12, `failed at a=${a}`)
  }
  assert.equal(regularizedBetaI(0, 4, 7), 0)
  assert.equal(regularizedBetaI(1, 4, 7), 1)
})

test('regularizedBetaI obeys the reflection identity I_x(a,b) = 1 - I_{1-x}(b,a)', () => {
  for (const [x, a, b] of [[0.3, 2, 5], [0.8, 4, 2], [0.55, 3.5, 3.5]]) {
    const lhs = regularizedBetaI(x, a, b)
    const rhs = 1 - regularizedBetaI(1 - x, b, a)
    assert.ok(Math.abs(lhs - rhs) < 1e-12, `failed at x=${x}, a=${a}, b=${b}`)
  }
})
