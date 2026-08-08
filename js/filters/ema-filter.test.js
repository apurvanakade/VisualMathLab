/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { emaFilter } = VM.filters

test('emaFilter seeds the first output with the first sample', () => {
  const ys = emaFilter([7, 9, 11], 0.5)
  assert.equal(ys[0], 7)
})

test('emaFilter matches hand-computed values for alpha=0.5', () => {
  const ys = emaFilter([1, 3, 5], 0.5)
  assert.deepEqual(ys, [1, 2, 3.5])
})

test('emaFilter with alpha=0 tracks the raw input exactly (no smoothing)', () => {
  const xs = [4, -2, 10, 0]
  assert.deepEqual(emaFilter(xs, 0), xs)
})

test('emaFilter on a constant stream returns the constant throughout', () => {
  const ys = emaFilter([2, 2, 2, 2], 0.9)
  for (const y of ys) assert.equal(y, 2)
})
