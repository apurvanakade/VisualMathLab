/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { triangulationEdges } = VM.discreteMath

test('triangulationEdges returns exactly 3N(N+1)/2 unique edges (Euler\'s formula)', () => {
  // V - E + F = 2 for the planar graph (triangles + outer face):
  // V = (N+1)(N+2)/2, F = N^2 + 1 -> E = 3N(N+1)/2.
  for (const N of [1, 2, 3, 5, 8, 12, 20]) {
    const edges = triangulationEdges(N)
    assert.equal(edges.length, 3 * N * (N + 1) / 2)
  }
})

test('every edge connects two distinct triples differing by exactly one unit step', () => {
  for (const N of [3, 7]) {
    for (const { a, b } of triangulationEdges(N)) {
      assert.notEqual(a.join(','), b.join(','))
      let diffSum = 0
      for (let k = 0; k < 3; k++) diffSum += Math.abs(a[k] - b[k])
      assert.equal(diffSum, 2)
    }
  }
})

test('no duplicate edges', () => {
  for (const N of [4, 9]) {
    const seen = new Set()
    for (const { a, b } of triangulationEdges(N)) {
      const aKey = a.join(','), bKey = b.join(',')
      const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`
      assert.ok(!seen.has(key), `duplicate edge ${key}`)
      seen.add(key)
    }
  }
})
