/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { lognormalPdf, normalPdf } = VM.distributions

test('lognormalPdf is the normal density with the change-of-variable factor', () => {
  const mean = 0.4, variance = 0.6
  for (const x of [0.2, 1, 2.5, 7]) {
    const expected = normalPdf(Math.log(x), mean, variance) / x
    assert.ok(Math.abs(lognormalPdf(x, mean, variance) - expected) < 1e-12)
  }
})

test('lognormalPdf integrates to approximately 1', () => {
  const mean = 0, variance = 1
  let total = 0
  const dx = 0.001
  for (let x = dx / 2; x < 60; x += dx) total += lognormalPdf(x, mean, variance) * dx
  assert.ok(Math.abs(total - 1) < 1e-3)
})

test('lognormalPdf is 0 on the non-positive half-line', () => {
  assert.equal(lognormalPdf(0, 0, 1), 0)
  assert.equal(lognormalPdf(-2, 0, 1), 0)
})
