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
const { makeFunction } = VM.expressions

test('makeFunction compiles a valid expression and evaluates it correctly', () => {
  const f = makeFunction(mathjs, 'x^3 - x - 2')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(2) - 4) < 1e-10, `f(2) should be 4, got ${f(2)}`)
})

test('makeFunction normalizes π to pi', () => {
  const f = makeFunction(mathjs, 'sin(π/2)')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(0) - 1) < 1e-10)
})

test('makeFunction returns null for an unparseable expression', () => {
  assert.equal(makeFunction(mathjs, 'x +* 2'), null)
})

test('makeFunction returns a function that yields NaN (not a throw) for undefined evaluations', () => {
  const f = makeFunction(mathjs, 'undefinedVariableName')
  assert.notEqual(f, null)
  assert.ok(Number.isNaN(f(1)))
})
