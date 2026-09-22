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
const { makeFunction2 } = VM.expressions

test('makeFunction2 compiles a (t, y) ODE right-hand side', () => {
  const f = makeFunction2(mathjs, 't + y')
  assert.notEqual(f, null)
  assert.ok(Math.abs(f(2, 3) - 5) < 1e-10, `f(2, 3) should be 5, got ${f(2, 3)}`)
})

test('makeFunction2 returns null for an unparseable expression', () => {
  assert.equal(makeFunction2(mathjs, 't +* y'), null)
})
