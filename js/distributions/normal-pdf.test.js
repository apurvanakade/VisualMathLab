/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { normalPdf } = VM.distributions

test('normalPdf(0, 0, 1) matches the standard normal peak', () => {
  assert.ok(Math.abs(normalPdf(0, 0, 1) - 1 / Math.sqrt(2 * Math.PI)) < 1e-9)
})

test('normalPdf integrates to approximately 1', () => {
  const mean = 3
  const variance = 4
  const step = 0.01
  let integral = 0
  for (let x = mean - 30; x < mean + 30; x += step) integral += normalPdf(x, mean, variance) * step
  assert.ok(Math.abs(integral - 1) < 0.01, `expected integral near 1, got ${integral}`)
})
