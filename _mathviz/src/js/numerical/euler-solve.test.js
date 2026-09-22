/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { eulerSolve } = VM.numerical

test('eulerSolve produces n+1 points spanning [t0, tEnd]', () => {
  const { ts, ys } = eulerSolve((t, y) => y, 0, 1, 1, 10)
  assert.equal(ts.length, 11)
  assert.equal(ys.length, 11)
  assert.equal(ts[0], 0)
  assert.ok(Math.abs(ts[10] - 1) < 1e-9)
})

test('eulerSolve on y\' = y, y(0) = 1 approaches e but underestimates it (forward Euler bias for convex growth)', () => {
  const { ys } = eulerSolve((t, y) => y, 0, 1, 1, 1000)
  const final = ys[ys.length - 1]
  assert.ok(final < Math.E, `Euler estimate ${final} should undershoot e=${Math.E}`)
  assert.ok(Math.abs(final - Math.E) < 0.01, `Euler estimate ${final} should be close to e with 1000 steps`)
})
