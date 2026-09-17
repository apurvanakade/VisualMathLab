/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { weibullPdf, exponentialPdf } = VM.distributions

test('weibullPdf with shape 1 is exponential with rate 1/scale', () => {
  const scale = 2.5
  for (const x of [0, 0.5, 1, 4, 9]) {
    assert.ok(Math.abs(weibullPdf(x, 1, scale) - exponentialPdf(x, 1 / scale)) < 1e-12)
  }
})

test('weibullPdf integrates to approximately 1', () => {
  const shape = 1.8, scale = 1.4
  let total = 0
  const dx = 0.0005
  for (let x = dx / 2; x < 20; x += dx) total += weibullPdf(x, shape, scale) * dx
  assert.ok(Math.abs(total - 1) < 1e-3)
})

test('weibullPdf is 0 on the negative half-line', () => {
  assert.equal(weibullPdf(-1, 2, 1), 0)
})

test('weibullPdf shape below 1 decreases, above 1 has an interior peak', () => {
  assert.ok(weibullPdf(0.1, 0.5, 1) > weibullPdf(1, 0.5, 1))
  assert.ok(weibullPdf(1, 3, 1) > weibullPdf(0.1, 3, 1))
})
