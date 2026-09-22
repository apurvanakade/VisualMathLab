/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import * as mathjs from 'mathjs'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { makeDerivative } = VM.expressions

test('makeDerivative returns the correct symbolic derivative', () => {
  const df = makeDerivative(mathjs, 'x^3 - x - 2')
  assert.notEqual(df, null)
  // d/dx(x^3 - x - 2) = 3x^2 - 1, at x=2 -> 11
  assert.ok(Math.abs(df(2) - 11) < 1e-10, `df(2) should be 11, got ${df(2)}`)
})

test('makeDerivative returns null for an unparseable expression', () => {
  assert.equal(makeDerivative(mathjs, 'x +* 2'), null)
})
