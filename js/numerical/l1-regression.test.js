/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { l1Regression } = VM.numerical

test('l1Regression recovers slope and intercept of points exactly on a line', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]
  const { slope, intercept, xlo, xhi } = l1Regression(points)
  assert.ok(Math.abs(slope - 2) < 1e-6, `slope ${slope}`)
  assert.ok(Math.abs(intercept - 1) < 1e-6, `intercept ${intercept}`)
  assert.equal(xlo, 0)
  assert.equal(xhi, 3)
})

test('l1Regression is far less dragged by a single large outlier than an L2 fit would be', () => {
  const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 100 }]
  const l1 = l1Regression(points)
  const l2 = VM.numerical.linearRegression(points)
  // Ground truth (ignoring the outlier) is slope 1 -- L1 should stay much
  // closer to it than L2, which gets pulled toward the outlier.
  assert.ok(Math.abs(l1.slope - 1) < Math.abs(l2.slope - 1), `l1 slope ${l1.slope}, l2 slope ${l2.slope}`)
})

test('l1Regression returns null for fewer than two points', () => {
  assert.equal(l1Regression([]), null)
  assert.equal(l1Regression([{ x: 0, y: 0 }]), null)
})

test('l1Regression returns null for a degenerate vertical fit', () => {
  const points = [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }]
  assert.equal(l1Regression(points), null)
})
