/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks that the coverage the page reports for its examples lands where
// the lecture notes' table says it should: near 95% for the median, well
// below it for the mean and the 90th percentile at n = 10, and exactly 0
// for the maximum of a uniform.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, coverageRun, populations, statLabels } from './method.js'

const VM = loadVM()
const coverage = (title) => {
  const {params} = examples.find(e => e.title === title)
  const run = coverageRun({...params, n: Number(params.n), R: 1000, N: 1000, rng: VM.sampling.seededRandom(1)})
  return run.intervals.filter(i => i.hit).length / run.intervals.length
}

test('every example names a population and statistic the page offers', () => {
  for (const {title, params} of examples) {
    assert.ok(params.pop in populations && statLabels.has(params.stat), title)
  }
})

test('the median of a lognormal covers about 95% at n = 30', () => {
  const c = coverage('Median of a lognormal, n = 30')
  assert.ok(c > 0.92 && c < 0.975, `${c}`)
})

test('the mean of a lognormal undercovers at n = 10', () => {
  const c = coverage('Mean of a lognormal, n = 10')
  assert.ok(c > 0.72 && c < 0.87, `${c}`)
})

test('the 90th percentile undercovers badly at n = 10', () => {
  const c = coverage('90th percentile of a lognormal, n = 10')
  assert.ok(c > 0.55 && c < 0.73, `${c}`)
})

// Every resample's maximum is at most the sample's, which is below 1.
test('the maximum of a uniform is never covered', () => {
  assert.equal(coverage('Maximum of a uniform, n = 50'), 0)
})
