/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { vertexColor } = VM.discreteMath

test('vertexColor maps each Sperner color name onto the shared chart palette', () => {
  const colors = VM.plotting.colors()
  assert.equal(vertexColor('red'), colors.alt)
  assert.equal(vertexColor('green'), colors.ok)
  assert.equal(vertexColor('blue'), colors.fn)
})

test('vertexColor returns three distinct colors, none a CSS named color', () => {
  const values = [vertexColor('red'), vertexColor('green'), vertexColor('blue')]
  assert.equal(new Set(values).size, 3)
  for (const value of values) assert.match(value, /^#[0-9a-f]{6}$/i)
})

test('vertexColor returns null for anything that is not one of the three names', () => {
  assert.equal(vertexColor('gold'), null)
  assert.equal(vertexColor(undefined), null)
})
