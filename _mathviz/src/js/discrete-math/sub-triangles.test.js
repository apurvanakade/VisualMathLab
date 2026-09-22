/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { subTriangleTriples } = VM.discreteMath

test('subTriangleTriples returns N^2 triangles, each vertex summing to N', () => {
  for (const N of [1, 2, 5, 12]) {
    const triangles = subTriangleTriples(N)
    assert.equal(triangles.length, N * N)
    for (const tri of triangles) {
      for (const [a, b, c] of tri) assert.equal(a + b + c, N)
    }
  }
})

function positionOf([a, b, c], A, B, C, N) {
  return {
    x: (a * A.x + b * B.x + c * C.x) / N,
    y: (a * A.y + b * B.y + c * C.y) / N,
  }
}

function signedArea(p1, p2, p3) {
  return 0.5 * ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y))
}

test('subTriangleTriples tiles the parent triangle exactly (no gaps or overlaps)', () => {
  const A = { x: 1, y: 0 }, B = { x: 0.5, y: Math.sqrt(3) / 2 }, C = { x: 0, y: 0 }
  const bigArea = Math.abs(signedArea(A, B, C))
  for (const N of [3, 7, 11]) {
    let sumArea = 0
    for (const tri of subTriangleTriples(N)) {
      const positions = []
      for (const vertex of tri) positions.push(positionOf(vertex, A, B, C, N))
      sumArea += Math.abs(signedArea(positions[0], positions[1], positions[2]))
    }
    assert.ok(Math.abs(sumArea - bigArea) < 1e-9, `N=${N}: sum area ${sumArea} != ${bigArea}`)
  }
})
