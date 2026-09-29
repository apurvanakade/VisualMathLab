/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { randomWalkMatrix } = VM.discreteMath

test('randomWalkMatrix on a path 0-1-2', () => {
  const {P, degrees, stationary} = randomWalkMatrix(3, [[0, 1], [1, 2]])
  assert.deepEqual(degrees, [1, 2, 1])
  assert.deepEqual(P, [[0, 1, 0], [0.5, 0, 0.5], [0, 1, 0]])
  assert.deepEqual(stationary, [0.25, 0.5, 0.25])
})

test('randomWalkMatrix lazy walk is (I + P) / 2 with rows summing to 1', () => {
  const {P} = randomWalkMatrix(3, [[0, 1], [1, 2]], {lazy: true})
  assert.deepEqual(P, [[0.5, 0.5, 0], [0.25, 0.5, 0.25], [0, 0.5, 0.5]])
})

test('randomWalkMatrix: stationary distribution is invariant', () => {
  const edges = [[0, 1], [1, 2], [2, 0], [2, 3]]
  const {P, stationary} = randomWalkMatrix(4, edges)
  for (let j = 0; j < 4; j++) {
    let sum = 0
    for (let i = 0; i < 4; i++) sum += stationary[i] * P[i][j]
    assert.ok(Math.abs(sum - stationary[j]) < 1e-12)
  }
})

test('randomWalkMatrix: an isolated vertex stays put', () => {
  const {P, stationary} = randomWalkMatrix(3, [[0, 1]])
  assert.deepEqual(P[2], [0, 0, 1])
  assert.equal(stationary[2], 0)
})
