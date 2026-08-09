/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { kalman1DFilter, kalman1DStep } = VM.filters

test('kalman1DFilter returns xs/Ps/Ks each the same length as the input', () => {
  const {xs, Ps, Ks} = kalman1DFilter([1, 2, 3, 4], {R: 1, Q: 0.1})
  assert.equal(xs.length, 4)
  assert.equal(Ps.length, 4)
  assert.equal(Ks.length, 4)
})

test('kalman1DFilter on constant noiseless measurements tracks the constant exactly', () => {
  const zs = [5, 5, 5, 5, 5, 5]
  const {xs} = kalman1DFilter(zs, {R: 1, Q: 0})
  for (const x of xs) assert.equal(x, 5)
})

test('kalman1DFilter gain decreases over time when Q=0 (growing confidence in a static state)', () => {
  const zs = new Array(6).fill(5)
  const {Ks} = kalman1DFilter(zs, {R: 1, Q: 0})
  for (let i = 1; i < Ks.length; i++) {
    assert.ok(Ks[i] < Ks[i - 1], `expected gain to keep shrinking, got ${Ks[i - 1]} then ${Ks[i]}`)
  }
})

test('kalman1DFilter gain stays in (0, 1]', () => {
  const {Ks} = kalman1DFilter([1, -3, 2, 8, 0, 5], {R: 0.5, Q: 0.2})
  for (const K of Ks) assert.ok(K > 0 && K <= 1, `expected gain in (0,1], got ${K}`)
})

test('kalman1DFilter trusts the measurement almost fully when Q is huge relative to R', () => {
  const {Ks} = kalman1DFilter([1, 2, 3], {R: 0.01, Q: 1000})
  for (const K of Ks) assert.ok(K > 0.99, `expected gain near 1, got ${K}`)
})

test('kalman1DStep computes one predict+update step by hand', () => {
  const step = kalman1DStep({xHat: 5, P: 1}, 6, {R: 1, Q: 0.5})
  // pPred = 1.5, K = 1.5/2.5 = 0.6, xHat = 5 + 0.6*(6-5) = 5.6, P = 0.4*1.5 = 0.6
  assert.ok(Math.abs(step.xHat - 5.6) < 1e-10, `xHat: ${step.xHat}`)
  assert.ok(Math.abs(step.P - 0.6) < 1e-10, `P: ${step.P}`)
  assert.ok(Math.abs(step.K - 0.6) < 1e-10, `K: ${step.K}`)
})

test('kalman1DStep chained by hand matches kalman1DFilter over the same measurements', () => {
  const zs = [1, 2, 3, 4, 5]
  const opts = {R: 1, Q: 0.2, x0: 0, P0: 1}
  const batch = kalman1DFilter(zs, opts)

  let state = {xHat: opts.x0, P: opts.P0}
  const xs = []
  for (const z of zs) {
    state = kalman1DStep(state, z, opts)
    xs.push(state.xHat)
  }
  assert.deepEqual(xs, batch.xs)
})
