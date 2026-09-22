/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { eulerSolve, rk4Solve } = VM.numerical

test('rk4Solve produces n+1 points spanning [t0, tEnd]', () => {
  const { ts, ys } = rk4Solve((t, y) => y, 0, 1, 1, 10)
  assert.equal(ts.length, 11)
  assert.equal(ys.length, 11)
})

test('rk4Solve is far more accurate than eulerSolve for the same step count', () => {
  const n = 10
  const { ys: eulerYs } = eulerSolve((t, y) => y, 0, 1, 1, n)
  const { ys: rk4Ys } = rk4Solve((t, y) => y, 0, 1, 1, n)
  const eulerError = Math.abs(eulerYs[n] - Math.E)
  const rk4Error = Math.abs(rk4Ys[n] - Math.E)
  assert.ok(rk4Error < eulerError / 100, `RK4 error ${rk4Error} should be far smaller than Euler error ${eulerError}`)
  assert.ok(rk4Error < 1e-4, `RK4 error ${rk4Error} should be tiny with only ${n} steps`)
})
