/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { autocorrelation } = VM.mcmc

test('autocorrelation starts at 1 and stays in [-1, 1]', () => {
  const rng = VM.sampling.seededRandom(3)
  const values = []
  for (let i = 0; i < 200; i++) values.push(rng())
  const acf = autocorrelation(values, 20)
  assert.equal(acf.length, 21)
  assert.equal(acf[0], 1)
  for (const r of acf) assert.ok(r >= -1 && r <= 1)
})

test('autocorrelation of an alternating series is -1-ish at lag 1 and 1-ish at lag 2', () => {
  const values = []
  for (let i = 0; i < 100; i++) values.push(i % 2 === 0 ? 1 : -1)
  const acf = autocorrelation(values, 2)
  assert.ok(Math.abs(acf[1] + 0.99) < 1e-9)
  assert.ok(Math.abs(acf[2] - 0.98) < 1e-9)
})

test('autocorrelation caps the lag at n - 1 and handles constant and tiny series', () => {
  assert.equal(autocorrelation([1, 2, 3], 50).length, 3)
  assert.deepEqual(autocorrelation([5, 5, 5, 5], 3), [1, 0, 0, 0])
  assert.deepEqual(autocorrelation([7]), [1])
  assert.deepEqual(autocorrelation([]), [1])
})

test('autocorrelation does not depend on the scale of the data', () => {
  // Lag-1: sum of (x_t - m)(x_{t-1} - m) = -3 * (5e-8)^2, over 4 * (5e-8)^2.
  const acf = autocorrelation([0, 1e-7, 0, 1e-7], 1)
  assert.ok(Math.abs(acf[1] + 0.75) < 1e-9, `${acf}`)
  // A constant series whose mean doesn't round exactly still reads as constant.
  const tenths = new Array(1000).fill(0.1)
  assert.deepEqual(autocorrelation(tenths, 3), [1, 0, 0, 0])
})
