/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { springLayout } = VM.discreteMath

test('springLayout is deterministic, finite and normalized to [-1, 1]', () => {
  const edges = []
  for (let i = 0; i < 10; i++) edges.push([i, (i + 1) % 10])
  const a = springLayout(10, edges, {seed: 1})
  const b = springLayout(10, edges, {seed: 1})
  assert.deepEqual(a, b)
  let maxAbs = 0
  for (const [x, y] of a) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y))
    maxAbs = Math.max(maxAbs, Math.abs(x), Math.abs(y))
  }
  assert.ok(Math.abs(maxAbs - 1) < 1e-9)
})

test('springLayout keeps adjacent vertices closer than the graph diameter apart', () => {
  // Two triangles joined by one bridge edge: the bridge should be longer
  // than a triangle side.
  const edges = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [2, 3]]
  const pos = springLayout(6, edges)
  const dist = (i, j) => Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])
  assert.ok(dist(0, 1) < dist(0, 5))
})

test('springLayout edge cases', () => {
  assert.deepEqual(springLayout(0, []), [])
  assert.deepEqual(springLayout(1, []), [[0, 0]])
})
