/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { spernerColor, barycentricTriples, subTriangleTriples } = VM.discreteMath

test('spernerColor satisfies Sperner\'s condition over many random trials', () => {
  const N = 6
  let sawInteriorRed = false, sawInteriorGreen = false, sawInteriorBlue = false
  for (let trial = 0; trial < 500; trial++) {
    for (const [a, b, c] of barycentricTriples(N)) {
      const color = spernerColor(a, b, c)
      if (a === 0 && b === 0) {
        assert.equal(color, 'red', 'vertex (0,0,N) is always red')
      } else if (b === 0 && c === 0) {
        assert.equal(color, 'green', 'vertex (N,0,0) is always green')
      } else if (c === 0 && a === 0) {
        assert.equal(color, 'blue', 'vertex (0,N,0) is always blue')
      } else if (a === 0) {
        assert.ok(color === 'red' || color === 'blue', 'edge a=0 is red/blue only')
      } else if (b === 0) {
        assert.ok(color === 'red' || color === 'green', 'edge b=0 is red/green only')
      } else if (c === 0) {
        assert.ok(color === 'green' || color === 'blue', 'edge c=0 is green/blue only')
      } else {
        if (color === 'red') sawInteriorRed = true
        if (color === 'green') sawInteriorGreen = true
        if (color === 'blue') sawInteriorBlue = true
      }
    }
  }
  assert.ok(sawInteriorRed && sawInteriorGreen && sawInteriorBlue, 'interior points take all three colors over many trials')
})

test('Sperner\'s lemma: a spernerColor-colored triangulation always has an odd number of rainbow (RGB) triangles', () => {
  for (const N of [3, 4, 5, 8, 10]) {
    for (let trial = 0; trial < 15; trial++) {
      const colorMap = new Map()
      for (const [a, b, c] of barycentricTriples(N)) {
        colorMap.set(`${a},${b},${c}`, spernerColor(a, b, c))
      }
      let rgbCount = 0
      for (const tri of subTriangleTriples(N)) {
        const colors = new Set()
        for (const triple of tri) colors.add(colorMap.get(triple.join(',')))
        if (colors.size === 3) rgbCount++
      }
      assert.equal(rgbCount % 2, 1, `N=${N} trial=${trial}: RGB count ${rgbCount} should be odd`)
    }
  }
})
