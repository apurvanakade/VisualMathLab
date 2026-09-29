/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { randomWalkMetropolis } = VM.mcmc

const standardNormal = (x) => -0.5 * x[0] * x[0]

test('randomWalkMetropolis returns n aligned states, starting at start', () => {
  const run = randomWalkMetropolis({logDensity: standardNormal, start: [0], n: 50, scale: 1, rng: VM.sampling.seededRandom(1)})
  assert.equal(run.samples.length, 50)
  assert.equal(run.proposals.length, 50)
  assert.equal(run.accepted.length, 50)
  assert.deepEqual(run.samples[0], [0])
  assert.equal(run.proposals[0], null)
  let count = 0
  for (let t = 1; t < 50; t++) {
    if (run.accepted[t]) {
      count++
      assert.deepEqual(run.samples[t], run.proposals[t])
    } else {
      assert.deepEqual(run.samples[t], run.samples[t - 1])
    }
  }
  assert.equal(run.acceptedCount, count)
})

test('randomWalkMetropolis is reproducible from a seed', () => {
  const a = randomWalkMetropolis({logDensity: standardNormal, start: [0], n: 100, scale: 2, rng: VM.sampling.seededRandom(9)})
  const b = randomWalkMetropolis({logDensity: standardNormal, start: [0], n: 100, scale: 2, rng: VM.sampling.seededRandom(9)})
  assert.deepEqual(a.samples, b.samples)
})

test('randomWalkMetropolis targets N(0, 1): mean ~ 0, variance ~ 1', () => {
  const run = randomWalkMetropolis({logDensity: standardNormal, start: [0], n: 40000, scale: 2.5, rng: VM.sampling.seededRandom(2)})
  let sum = 0, sumSq = 0
  for (const s of run.samples) {
    sum += s[0]
    sumSq += s[0] * s[0]
  }
  const mean = sum / run.samples.length
  const variance = sumSq / run.samples.length - mean * mean
  assert.ok(Math.abs(mean) < 0.08, `mean ${mean}`)
  assert.ok(Math.abs(variance - 1) < 0.1, `variance ${variance}`)
})

test('randomWalkMetropolis never leaves the support of a uniform target', () => {
  const inDisk = (x) => (x[0] * x[0] + x[1] * x[1] <= 1 ? 0 : -Infinity)
  const run = randomWalkMetropolis({logDensity: inDisk, start: [0, 0], n: 2000, scale: 0.8, rng: VM.sampling.seededRandom(4)})
  for (const s of run.samples) assert.ok(s[0] * s[0] + s[1] * s[1] <= 1)
  assert.ok(run.acceptedCount > 0 && run.acceptedCount < 1999)
})

test('randomWalkMetropolis with a gaussian proposal also targets N(0, 1)', () => {
  const run = randomWalkMetropolis({logDensity: standardNormal, start: [3], n: 40000, scale: 1.5, proposal: 'gaussian', rng: VM.sampling.seededRandom(8)})
  let sum = 0
  for (let t = 1000; t < run.samples.length; t++) sum += run.samples[t][0]
  const mean = sum / (run.samples.length - 1000)
  assert.ok(Math.abs(mean) < 0.08, `mean ${mean}`)
})

test('randomWalkMetropolis rejects an n that is not a positive integer', () => {
  for (const n of [0, -3, 2.5, NaN]) {
    assert.throws(
      () => randomWalkMetropolis({logDensity: standardNormal, start: [0], n, scale: 1, rng: VM.sampling.seededRandom(1)}),
      RangeError,
    )
  }
})
