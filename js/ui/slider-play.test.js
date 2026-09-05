/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { playbackDuration, playbackFrame } = VM.ui

test('playbackDuration scales with the number of slider stops', () => {
  const duration = playbackDuration({min: 0, max: 19, step: 1, speed: 1})
  assert.equal(duration, 19 * 350)
})

test('playbackDuration divides by speed', () => {
  const base = playbackDuration({min: 0, max: 19, step: 1, speed: 1})
  const doubled = playbackDuration({min: 0, max: 19, step: 1, speed: 2})
  assert.equal(doubled, base / 2)
})

test('playbackDuration clamps a short sweep up to a minimum', () => {
  const duration = playbackDuration({min: 0, max: 1, step: 1, speed: 1})
  assert.equal(duration, 2000)
})

test('playbackDuration clamps a long sweep down to a maximum', () => {
  const duration = playbackDuration({min: 0, max: 1000, step: 1, speed: 1})
  assert.equal(duration, 10000)
})

test('playbackDuration returns 0 for a degenerate range', () => {
  const duration = playbackDuration({min: 5, max: 5, step: 1, speed: 1})
  assert.equal(duration, 0)
})

test('playbackDuration falls back to speed 1 for an unusable speed', () => {
  const base = playbackDuration({min: 0, max: 19, step: 1, speed: 1})
  assert.equal(playbackDuration({min: 0, max: 19, step: 1, speed: 0}), base)
  assert.equal(playbackDuration({min: 0, max: 19, step: 1, speed: NaN}), base)
  assert.equal(playbackDuration({min: 0, max: 19, step: 1, speed: -2}), base)
})

test('playbackDuration treats a stepless slider as ~100 stops', () => {
  // A slider with no usable step (e.g. step="any") has no grid of its own;
  // 100 stops is smooth enough to read as continuous at any sweep length,
  // and is what the clamp above caps at 10s regardless.
  const duration = playbackDuration({min: 0, max: 50, step: NaN, speed: 1})
  assert.equal(duration, 10000)
})

test('playbackFrame advances proportionally through a "once" sweep', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 500, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 10)
  assert.equal(frame.done, false)
})

test('playbackFrame finishes a "once" sweep at the maximum', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 1000, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 19)
  assert.equal(frame.done, true)
})

test('playbackFrame clamps a "once" sweep past its end instead of overshooting', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 5000, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 19)
  assert.equal(frame.done, true)
})

test('playbackFrame wraps a "loop" sweep back to the minimum, never done', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 1500, duration: 1000, mode: 'loop', start: 0})
  assert.equal(frame.value, 10)
  assert.equal(frame.done, false)
})

test('playbackFrame reverses direction on a "bounce" sweep past the far end', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 1500, duration: 1000, mode: 'bounce', start: 0})
  assert.equal(frame.value, 10)
  assert.equal(frame.direction, -1)
  assert.equal(frame.done, false)
})

test('playbackFrame keeps bouncing indefinitely, never done', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 3500, duration: 1000, mode: 'bounce', start: 0})
  assert.equal(frame.done, false)
})

test('playbackFrame counts steps from the minimum, not from zero', () => {
  const frame = playbackFrame({min: 2, max: 5, step: 0.5, elapsed: 500, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 3.5)
})

test('playbackFrame stays on the step grid instead of showing float noise', () => {
  // 3 * 0.1 lands on 0.30000000000000004 in floating point, which the
  // readout would show in full without the toPrecision trim.
  const frame = playbackFrame({min: 0, max: 1, step: 0.1, elapsed: 300, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 0.3)
})

test('playbackFrame resumes from a mid-track start fraction', () => {
  // A speed change mid-sweep re-bases the sweep to start from wherever the
  // thumb already is, rather than jumping back to the minimum.
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 0, duration: 1000, mode: 'once', start: 0.5})
  assert.equal(frame.value, 10)
})

test('playbackFrame returns the minimum, done, for a degenerate range', () => {
  const frame = playbackFrame({min: 5, max: 5, step: 1, elapsed: 100, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 5)
  assert.equal(frame.done, true)
})

test('playbackFrame returns the minimum, done, for a non-positive duration', () => {
  const frame = playbackFrame({min: 0, max: 19, step: 1, elapsed: 100, duration: 0, mode: 'once', start: 0})
  assert.equal(frame.value, 0)
  assert.equal(frame.done, true)
})

test('playbackFrame returns done for unreadable bounds', () => {
  assert.equal(playbackFrame({min: NaN, max: 19, step: 1, elapsed: 0, duration: 1000, mode: 'once', start: 0}).done, true)
  assert.equal(playbackFrame({min: 0, max: NaN, step: 1, elapsed: 0, duration: 1000, mode: 'once', start: 0}).done, true)
})

test('playbackFrame falls back to a synthesized step when the slider has none', () => {
  const frame = playbackFrame({min: 0, max: 50, step: NaN, elapsed: 500, duration: 1000, mode: 'once', start: 0})
  assert.equal(frame.value, 25)
})
