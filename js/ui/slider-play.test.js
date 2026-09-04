/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { playbackNextValue } = VM.ui

test('playbackNextValue advances one step by default', () => {
  const next = playbackNextValue({value: 3, min: 0, max: 19, step: 1, stepSize: 1})
  assert.equal(next, 4)
})

test('playbackNextValue advances by the step size, in slider steps', () => {
  const next = playbackNextValue({value: 3, min: 0, max: 19, step: 1, stepSize: 4})
  assert.equal(next, 7)
})

test('playbackNextValue scales the step size by the slider own step', () => {
  const next = playbackNextValue({value: 0.5, min: 0, max: 1, step: 0.01, stepSize: 5})
  assert.equal(next, 0.55)
})

test('playbackNextValue stays on the step grid instead of accumulating float drift', () => {
  let value = 0
  for (let i = 0; i < 3; i++) {
    value = playbackNextValue({value, min: 0, max: 1, step: 0.1, stepSize: 1})
  }
  assert.equal(value, 0.3)
})

test('playbackNextValue clamps the last step to the maximum', () => {
  const next = playbackNextValue({value: 18, min: 0, max: 19, step: 1, stepSize: 5})
  assert.equal(next, 19)
})

test('playbackNextValue returns null once the sweep reaches the maximum', () => {
  const next = playbackNextValue({value: 19, min: 0, max: 19, step: 1, stepSize: 1})
  assert.equal(next, null)
})

test('playbackNextValue returns null for a degenerate range', () => {
  const next = playbackNextValue({value: 0, min: 0, max: 0, step: 1, stepSize: 1})
  assert.equal(next, null)
})

test('playbackNextValue falls back to one step for an unusable step size', () => {
  assert.equal(playbackNextValue({value: 3, min: 0, max: 19, step: 1, stepSize: 0}), 4)
  assert.equal(playbackNextValue({value: 3, min: 0, max: 19, step: 1, stepSize: NaN}), 4)
  assert.equal(playbackNextValue({value: 3, min: 0, max: 19, step: 1, stepSize: -2}), 4)
})

test('playbackNextValue falls back to a step of one when the slider has none', () => {
  const next = playbackNextValue({value: 3, min: 0, max: 19, step: NaN, stepSize: 2})
  assert.equal(next, 5)
})

test('playbackNextValue counts steps from the minimum, not from zero', () => {
  const next = playbackNextValue({value: 2.5, min: 2, max: 5, step: 0.5, stepSize: 2})
  assert.equal(next, 3.5)
})

test('playbackNextValue returns null for unreadable bounds', () => {
  assert.equal(playbackNextValue({value: NaN, min: 0, max: 19, step: 1, stepSize: 1}), null)
  assert.equal(playbackNextValue({value: 0, min: NaN, max: 19, step: 1, stepSize: 1}), null)
  assert.equal(playbackNextValue({value: 0, min: 0, max: NaN, step: 1, stepSize: 1}), null)
})
