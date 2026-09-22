/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { barycentricTriples } = VM.discreteMath

test('barycentricTriples returns (N+1)(N+2)/2 points, each summing to N', () => {
  for (const N of [1, 2, 5, 10, 20]) {
    const triples = barycentricTriples(N)
    assert.equal(triples.length, (N + 1) * (N + 2) / 2)
    for (const [a, b, c] of triples) {
      assert.equal(a + b + c, N)
      assert.ok(a >= 0 && b >= 0 && c >= 0)
    }
  }
})

test('barycentricTriples has no duplicate triples', () => {
  const triples = barycentricTriples(8)
  const seen = new Set()
  for (const t of triples) {
    const key = t.join(',')
    assert.ok(!seen.has(key), `duplicate triple ${key}`)
    seen.add(key)
  }
})
