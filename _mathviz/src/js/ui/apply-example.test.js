/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

// syncExampleSelect and applyExampleParams look fields up with
// document.querySelector; `fields` maps a selector to a stand-in view.
const fields = {}
globalThis.document = {
  addEventListener: () => {},
  querySelector: selector => fields[selector] ?? null
}

const VM = loadVM()
const { findMatchingExample, syncExampleSelect, applyExampleParams } = VM.ui

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

// A stand-in for an Inputs.select view over [null, ...examples]: records
// every value it is set to and every event dispatched on it.
const fakeSelectView = optionCount => {
  const options = []
  for (let i = 0; i < optionCount; i++) options.push({disabled: false, hidden: false})
  const view = {
    sets: [],
    events: [],
    current: null,
    querySelector: selector => (selector === 'select' ? {options} : null),
    dispatchEvent: event => view.events.push(event),
    options
  }
  Object.defineProperty(view, 'value', {
    get: () => view.current,
    set: value => {
      view.sets.push(value)
      view.current = value
    }
  })
  return view
}

const fakeField = value => ({value, dispatchEvent: () => {}})

const selectors = {max: '#max', f: '#f', x0: '#x0'}

test('syncExampleSelect selects the matching example without dispatching an event', () => {
  fields['#max'] = fakeField('20')
  fields['#f'] = fakeField('x^2 - 2')
  fields['#x0'] = fakeField('1.5')
  const view = fakeSelectView(examples.length + 1)
  syncExampleSelect(view, examples, selectors)
  assert.equal(view.value, examples[1])
  assert.equal(view.events.length, 0)
})

test('syncExampleSelect disables and hides the "Custom inputs" option', () => {
  const view = fakeSelectView(examples.length + 1)
  syncExampleSelect(view, examples, selectors)
  assert.deepEqual(view.options[0], {disabled: true, hidden: true})
  assert.deepEqual(view.options[1], {disabled: false, hidden: false})
})

test('syncExampleSelect falls back to null ("Custom inputs") once a field is edited', () => {
  fields['#max'] = fakeField('20')
  fields['#f'] = fakeField('x^2 - 3')
  fields['#x0'] = fakeField('1.5')
  const view = fakeSelectView(examples.length + 1)
  view.current = examples[1]
  syncExampleSelect(view, examples, selectors)
  assert.equal(view.value, null)
})

test('syncExampleSelect leaves the dropdown alone while an example is being applied', async () => {
  fields['#max'] = fakeField('20')
  fields['#f'] = fakeField('x^2 - 2')
  fields['#x0'] = fakeField('1.5')
  const view = fakeSelectView(examples.length + 1)
  view.current = examples[0]
  const trigger = {querySelector: () => null}
  // Applies the first param, then waits 100 ms before the next: mid-apply.
  const applying = applyExampleParams(selectors, examples[0].params, trigger)
  syncExampleSelect(view, examples, selectors)
  assert.equal(view.sets.length, 0)
  await applying
  syncExampleSelect(view, examples, selectors)
  assert.equal(view.value, examples[0])
})
