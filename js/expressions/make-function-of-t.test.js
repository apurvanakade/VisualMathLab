/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import * as mathjs from 'mathjs'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { makeFunctionOfT } = VM.expressions

test('makeFunctionOfT compiles a valid expression and evaluates it correctly', () => {
  const f = makeFunctionOfT(mathjs, 't^3 - t - 2')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(2) - 4) < 1e-10, `f(2) should be 4, got ${f(2)}`)
})

test('makeFunctionOfT normalizes π to pi', () => {
  const f = makeFunctionOfT(mathjs, 'sin(π/2)')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(0) - 1) < 1e-10)
})

test('makeFunctionOfT returns null for an unparseable expression', () => {
  assert.equal(makeFunctionOfT(mathjs, 't +* 2'), null)
})

test('makeFunctionOfT returns a function that yields NaN (not a throw) for undefined evaluations', () => {
  const f = makeFunctionOfT(mathjs, 'undefinedVariableName')
  assert.notEqual(f, null)
  assert.ok(Number.isNaN(f(1)))
})

test('makeFunctionOfT binds t, not x', () => {
  const f = makeFunctionOfT(mathjs, 'cos(t)')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(0) - 1) < 1e-10)
})
