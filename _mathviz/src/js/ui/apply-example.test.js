/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { findMatchingExample } = VM.ui

const examples = [
  {title: 'Two-cycle', params: {max: '20', f: 'x^3 - 2*x + 2', x0: '0'}},
  {title: 'Quadratic', params: {max: '20', f: 'x^2 - 2', x0: '1.5'}}
]

test('findMatchingExample finds the example the fields hold', () => {
  const values = {max: '20', f: 'x^2 - 2', x0: '1.5'}
  assert.equal(findMatchingExample(examples, values).title, 'Quadratic')
})

test('findMatchingExample returns null once a field is edited', () => {
  const values = {max: '20', f: 'x^2 - 3', x0: '1.5'}
  assert.equal(findMatchingExample(examples, values), null)
})

test('findMatchingExample compares a slider number with a string param', () => {
  const sliders = [{title: 'n', params: {n: '6', alpha: 0.9}}]
  assert.equal(findMatchingExample(sliders, {n: 6, alpha: '0.9'}).title, 'n')
})

test('findMatchingExample ignores a param the page has no field for', () => {
  const values = {f: 'x^3 - 2*x + 2', x0: '0'}
  assert.equal(findMatchingExample(examples, values).title, 'Two-cycle')
})

test('findMatchingExample returns null when nothing can be compared', () => {
  assert.equal(findMatchingExample(examples, {}), null)
})

test('findMatchingExample compares nested tableau objects', () => {
  const tableaus = [{title: 'Euler', params: {s: '1', tableau: {a: [['0']], b: ['1'], c: ['0']}}}]
  assert.equal(findMatchingExample(tableaus, {s: '1', tableau: {c: ['0'], a: [['0']], b: ['1']}}).title, 'Euler')
  assert.equal(findMatchingExample(tableaus, {s: '1', tableau: {c: ['0'], a: [['0']], b: ['2']}}), null)
})
