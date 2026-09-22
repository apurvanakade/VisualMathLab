/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { makeRational } = VM.expressions

test('makeRational parses plain integers', () => {
  assert.deepEqual(makeRational('3'), { num: 3, den: 1 })
  assert.deepEqual(makeRational('-3'), { num: -3, den: 1 })
})

test('makeRational parses and reduces fractions', () => {
  assert.deepEqual(makeRational('1/2'), { num: 1, den: 2 })
  assert.deepEqual(makeRational('-1/3'), { num: -1, den: 3 })
  assert.deepEqual(makeRational('2/4'), { num: 1, den: 2 }, 'should reduce to lowest terms')
  assert.deepEqual(makeRational('1/-2'), { num: -1, den: 2 }, 'negative denominator normalized to negative numerator')
})

test('makeRational parses decimal literals', () => {
  assert.deepEqual(makeRational('0.25'), { num: 1, den: 4 })
  assert.deepEqual(makeRational('-0.5'), { num: -1, den: 2 })
})

test('makeRational returns null for invalid input', () => {
  assert.equal(makeRational(''), null)
  assert.equal(makeRational('abc'), null)
  assert.equal(makeRational('1/0'), null)
  assert.equal(makeRational('1.2.3'), null)
})
