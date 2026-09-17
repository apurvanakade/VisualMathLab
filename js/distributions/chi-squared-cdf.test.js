/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { chiSquaredCdf, chiSquaredPdf, regularizedGammaP } = VM.distributions

test('k = 2 is Exponential with mean 2: cdf(x) = 1 - e^{-x/2}', () => {
  for (const x of [0.5, 2, 5, 11]) {
    assert.ok(Math.abs(chiSquaredCdf(x, 2) - (1 - Math.exp(-x / 2))) < 1e-12, `failed at x=${x}`)
  }
})

test('k = 1 cdf(x) = erf(sqrt(x/2)): cdf(1, 1) approx 0.6826894921', () => {
  assert.ok(Math.abs(chiSquaredCdf(1, 1) - 0.6826894921) < 1e-8, `got ${chiSquaredCdf(1, 1)}`)
})

test('cdf is exactly the regularized lower incomplete gamma P(k/2, x/2)', () => {
  for (const [x, k] of [[3, 1], [7.5, 4], [20, 15], [1, 2]]) {
    assert.ok(
      Math.abs(chiSquaredCdf(x, k) - regularizedGammaP(k / 2, x / 2)) < 1e-14,
      `failed at x=${x}, k=${k}`,
    )
  }
})

test('textbook 0.95 critical values: cdf(3.841459, 1) and cdf(11.0705, 5) approx 0.95', () => {
  assert.ok(Math.abs(chiSquaredCdf(3.841459, 1) - 0.95) < 1e-4, `got ${chiSquaredCdf(3.841459, 1)}`)
  assert.ok(Math.abs(chiSquaredCdf(11.0705, 5) - 0.95) < 1e-3, `got ${chiSquaredCdf(11.0705, 5)}`)
})

test('cdf(0) = 0, and cdf is the integral of chiSquaredPdf (trapezoid), k = 4', () => {
  assert.equal(chiSquaredCdf(0, 4), 0)
  let area = 0
  const dx = 0.005
  for (let x = dx / 2; x < 6; x += dx) area += chiSquaredPdf(x, 4) * dx
  assert.ok(Math.abs(area - chiSquaredCdf(6, 4)) < 1e-3, `got ${area} vs ${chiSquaredCdf(6, 4)}`)
})
