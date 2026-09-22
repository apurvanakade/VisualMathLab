/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { paddedRange } = VM.plotting

test('paddedRange pads around the min/max of finite values, ignoring non-finite entries', () => {
  const { lo, hi } = paddedRange([1, 5, NaN, Infinity, 3])
  assert.ok(lo < 1 && hi > 5, `expected lo < 1 < ... < 5 < hi, got lo=${lo} hi=${hi}`)
})

test('paddedRange returns the empty range when there are no finite values', () => {
  assert.deepEqual(paddedRange([]), { lo: -1, hi: 1 })
  assert.deepEqual(paddedRange([NaN, Infinity, -Infinity]), { lo: -1, hi: 1 })
})

test('paddedRange applies at least minPadding even when every finite value is identical', () => {
  const { lo, hi } = paddedRange([5, 5, 5])
  assert.ok(hi - lo >= 1, `span should be at least 2*minPadding, got ${hi - lo}`)
})

test('paddedRange respects custom options', () => {
  const { lo, hi } = paddedRange([0, 10], { relativePadding: 0.5, minPadding: 0 })
  assert.equal(lo, -5)
  assert.equal(hi, 15)
})
