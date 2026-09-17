/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { cauchyPdf } = VM.distributions

test('cauchyPdf peaks at its location with height 1/(pi*scale)', () => {
  assert.ok(Math.abs(cauchyPdf(2, 2, 0.5) - 1 / (Math.PI * 0.5)) < 1e-12)
})

test('cauchyPdf falls to half its peak one scale from the centre', () => {
  const peak = cauchyPdf(0, 0, 1.5)
  assert.ok(Math.abs(cauchyPdf(1.5, 0, 1.5) - peak / 2) < 1e-12)
})

test('cauchyPdf is symmetric about its location', () => {
  for (const d of [0.3, 1, 4]) {
    assert.ok(Math.abs(cauchyPdf(1 + d, 1, 2) - cauchyPdf(1 - d, 1, 2)) < 1e-12)
  }
})

test('cauchyPdf has heavier tails than a normal of the same peak width', () => {
  // At 10 scales out the Cauchy is still appreciable; a normal is not.
  assert.ok(cauchyPdf(10, 0, 1) > 1e-3)
})
