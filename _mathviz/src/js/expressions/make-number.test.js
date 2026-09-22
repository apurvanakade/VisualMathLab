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
const { makeNumber } = VM.expressions

test('makeNumber evaluates a constant expression', () => {
  const value = makeNumber(mathjs, '1 + 2*3 + pi - e')
  assert.notEqual(value, null)
  assert.ok(Math.abs(value - (1 + 6 + Math.PI - Math.E)) < 1e-10)
})

test('makeNumber returns null for an unparseable expression', () => {
  assert.equal(makeNumber(mathjs, '1 +* 2'), null)
})

test('makeNumber returns null for an expression referencing a free variable (not finite/constant)', () => {
  assert.equal(makeNumber(mathjs, 'x + 1'), null)
})
