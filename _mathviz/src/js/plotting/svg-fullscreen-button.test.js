/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { svgAspectRatio, figureBounds } = VM.plotting

test('svgAspectRatio reads the viewBox first', () => {
  assert.equal(svgAspectRatio({viewBox: '0 0 720 288', width: '100', height: '100'}), 2.5)
  // Commas are legal viewBox separators too.
  assert.equal(svgAspectRatio({viewBox: '0,0,800,800'}), 1)
})

test('svgAspectRatio falls back to width/height attributes', () => {
  assert.equal(svgAspectRatio({viewBox: null, width: '600', height: '200'}), 3)
  assert.equal(svgAspectRatio({width: '600px', height: '300px'}), 2)
})

test('svgAspectRatio is null when nothing usable is set', () => {
  assert.equal(svgAspectRatio({}), null)
  assert.equal(svgAspectRatio({viewBox: '0 0 0 100'}), null)
  assert.equal(svgAspectRatio({width: '100%', height: 'auto'}), null)
})

test('figureBounds is the union of the rects', () => {
  const left = {left: 10, top: 20, right: 110, bottom: 120}
  const right = {left: 130, top: 30, right: 230, bottom: 100}
  assert.deepEqual(figureBounds([left, right]), {left: 10, top: 20, right: 230, bottom: 120})
  assert.deepEqual(figureBounds([left]), left)
  assert.equal(figureBounds([]), null)
})
