/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { negativeBinomialPmf, geometricPmf } = VM.distributions

test('negativeBinomialPmf with r = 1 is exactly the geometric', () => {
  const p = 0.35
  for (let k = 1; k <= 20; k++) {
    assert.ok(Math.abs(negativeBinomialPmf(k, 1, p) - geometricPmf(k, p)) < 1e-12)
  }
})

test('negativeBinomialPmf matches the closed form', () => {
  // P(K = 4 | r = 2, p) = C(3,1) p^2 (1-p)^2
  const p = 0.4
  const expected = 3 * p * p * (1 - p) * (1 - p)
  assert.ok(Math.abs(negativeBinomialPmf(4, 2, p) - expected) < 1e-12)
})

test('negativeBinomialPmf sums to approximately 1 over its support', () => {
  const r = 3
  const p = 0.25
  let sum = 0
  for (let k = r; k <= 2000; k++) sum += negativeBinomialPmf(k, r, p)
  assert.ok(Math.abs(sum - 1) < 1e-6)
})

test('negativeBinomialPmf has mean r/p', () => {
  const r = 4
  const p = 0.3
  let mean = 0
  for (let k = r; k <= 4000; k++) mean += k * negativeBinomialPmf(k, r, p)
  assert.ok(Math.abs(mean - r / p) < 1e-4)
})

test('negativeBinomialPmf is 0 outside its support', () => {
  assert.equal(negativeBinomialPmf(2, 3, 0.5), 0)
  assert.equal(negativeBinomialPmf(3.5, 2, 0.5), 0)
})
