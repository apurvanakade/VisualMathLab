/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { gibbsBivariateNormal } = VM.mcmc

test('gibbsBivariateNormal returns n + 1 states and axis-parallel half steps', () => {
  const gaussian = VM.sampling.gaussianRandom(VM.sampling.seededRandom(1))
  const run = gibbsBivariateNormal({rho: 0.5, n: 30, start: [2, -2], gaussian})
  assert.equal(run.x.length, 31)
  assert.equal(run.halfY.length, 31)
  assert.equal(run.x[0], 2)
  assert.equal(run.y[0], -2)
  for (let t = 1; t <= 30; t++) {
    assert.equal(run.halfX[t], run.x[t])
    assert.equal(run.halfY[t], run.y[t - 1])
  }
})

test('gibbsBivariateNormal recovers the target correlation', () => {
  const gaussian = VM.sampling.gaussianRandom(VM.sampling.seededRandom(7))
  const run = gibbsBivariateNormal({rho: 0.8, n: 40000, start: [0, 0], gaussian})
  let sxy = 0, sxx = 0, syy = 0
  for (let t = 1; t < run.x.length; t++) {
    sxy += run.x[t] * run.y[t]
    sxx += run.x[t] * run.x[t]
    syy += run.y[t] * run.y[t]
  }
  const corr = sxy / Math.sqrt(sxx * syy)
  assert.ok(Math.abs(corr - 0.8) < 0.03, `corr ${corr}`)
})
