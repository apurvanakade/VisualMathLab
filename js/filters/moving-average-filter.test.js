/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { movingAverageFilter } = VM.filters

test('movingAverageFilter averages a growing window before k samples have arrived', () => {
  const ys = movingAverageFilter([1, 2, 3, 4, 5], 2)
  assert.deepEqual(ys, [1, 1.5, 2.5, 3.5, 4.5])
})

test('movingAverageFilter with k=1 returns the input unchanged', () => {
  const xs = [3, -1, 4, 1, 5]
  assert.deepEqual(movingAverageFilter(xs, 1), xs)
})

test('movingAverageFilter on a constant stream returns the constant throughout', () => {
  const ys = movingAverageFilter([5, 5, 5, 5, 5], 3)
  for (const y of ys) assert.equal(y, 5)
})
