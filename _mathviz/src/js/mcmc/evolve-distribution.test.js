/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { evolveDistribution } = VM.mcmc

test('evolveDistribution takes row-vector steps p P', () => {
  const P = [[0, 1], [0.5, 0.5]]
  const out = evolveDistribution(P, [1, 0], 2)
  assert.deepEqual(out, [[1, 0], [0, 1], [0.5, 0.5]])
})

test('evolveDistribution converges to the stationary distribution and keeps mass 1', () => {
  const P = [[0.9, 0.1], [0.3, 0.7]]
  const out = evolveDistribution(P, [0, 1], 200)
  const last = out[200]
  assert.ok(Math.abs(last[0] - 0.75) < 1e-9)
  assert.ok(Math.abs(last[0] + last[1] - 1) < 1e-12)
})

test('evolveDistribution copies p0', () => {
  const p0 = [1, 0]
  const out = evolveDistribution([[1, 0], [0, 1]], p0, 0)
  assert.notEqual(out[0], p0)
  assert.deepEqual(out, [[1, 0]])
})
