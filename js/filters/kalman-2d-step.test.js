/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import * as mathjs from 'mathjs'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { kalman2DStep } = VM.filters

const smallQ = [
  [0.001, 0, 0, 0],
  [0, 0.001, 0, 0],
  [0, 0, 0.001, 0],
  [0, 0, 0, 0.001]
]
const smallR = [[0.001, 0], [0, 0.001]]
const initialP = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1]
]

test('kalman2DStep returns a 4-element state and a 4x4 covariance', () => {
  const prev = {x: [0, 0, 0, 0], P: initialP}
  const {x, P} = kalman2DStep(mathjs, prev, [1, 2], {Q: smallQ, R: smallR})
  assert.equal(x.length, 4)
  assert.equal(P.length, 4)
  for (const row of P) assert.equal(row.length, 4)
})

test('kalman2DStep repeatedly fed the same stationary point converges to it', () => {
  let state = {x: [5, 5, 0, 0], P: initialP}
  for (let i = 0; i < 30; i++) {
    state = kalman2DStep(mathjs, state, [0, 0], {Q: smallQ, R: smallR})
  }
  assert.ok(Math.abs(state.x[0]) < 0.05, `x should converge near 0, got ${state.x[0]}`)
  assert.ok(Math.abs(state.x[1]) < 0.05, `y should converge near 0, got ${state.x[1]}`)
})

test('kalman2DStep with near-zero R trusts the measurement almost fully', () => {
  const prev = {x: [0, 0, 0, 0], P: initialP}
  const tinyR = [[1e-8, 0], [0, 1e-8]]
  const {x} = kalman2DStep(mathjs, prev, [3, -4], {Q: smallQ, R: tinyR})
  assert.ok(Math.abs(x[0] - 3) < 1e-3, `x should nearly equal the measurement, got ${x[0]}`)
  assert.ok(Math.abs(x[1] - (-4)) < 1e-3, `y should nearly equal the measurement, got ${x[1]}`)
})

test('kalman2DStep with huge R barely moves the prediction toward the measurement', () => {
  const prev = {x: [0, 0, 1, 0], P: initialP}
  const hugeR = [[1e8, 0], [0, 1e8]]
  const {x} = kalman2DStep(mathjs, prev, [100, 100], {Q: smallQ, R: hugeR})
  // Predicted position after one constant-velocity step is [1, 0]; with
  // R this large the measurement should barely pull it toward [100, 100].
  assert.ok(Math.abs(x[0] - 1) < 0.1, `x should stay near the prediction (1), got ${x[0]}`)
  assert.ok(Math.abs(x[1] - 0) < 0.1, `y should stay near the prediction (0), got ${x[1]}`)
})

test('kalman2DStep reduces uncertainty (covariance trace shrinks after an update)', () => {
  const prev = {x: [0, 0, 0, 0], P: initialP}
  const {P} = kalman2DStep(mathjs, prev, [1, 1], {Q: smallQ, R: smallR})
  const traceBefore = initialP[0][0] + initialP[1][1] + initialP[2][2] + initialP[3][3]
  const traceAfter = P[0][0] + P[1][1] + P[2][2] + P[3][3]
  assert.ok(traceAfter < traceBefore, `expected uncertainty to shrink, got ${traceBefore} -> ${traceAfter}`)
})

test('kalman2DStep advances position by velocity under the constant-velocity prediction when R is huge', () => {
  const prev = {x: [0, 0, 2, 3], P: initialP}
  const hugeR = [[1e10, 0], [0, 1e10]]
  const {x} = kalman2DStep(mathjs, prev, [0, 0], {Q: smallQ, R: hugeR})
  assert.ok(Math.abs(x[0] - 2) < 0.1, `x should advance by vx=2, got ${x[0]}`)
  assert.ok(Math.abs(x[1] - 3) < 0.1, `y should advance by vy=3, got ${x[1]}`)
})
