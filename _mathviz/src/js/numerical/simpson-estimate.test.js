/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { simpsonEstimate } = VM.numerical

test('simpsonEstimate integrates x^2 over [0,1] exactly (Simpson is exact for cubics and below)', () => {
  const result = simpsonEstimate(x => x * x, 0, 1, 10)
  assert.ok(Math.abs(result - 1 / 3) < 1e-10, `got ${result}, expected 1/3`)
})

test('simpsonEstimate integrates sin over [0, pi] close to the exact value 2', () => {
  const result = simpsonEstimate(Math.sin, 0, Math.PI, 20)
  assert.ok(Math.abs(result - 2) < 1e-4, `got ${result}, expected ~2`)
})
