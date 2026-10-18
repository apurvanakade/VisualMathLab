/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the numbers the page reports for its examples against the ones
// the lecture notes quote, and the resampling schemes' invariants.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, parseData, resample, pValue, percentileInterval, median, tCellA, tCellB } from './method.js'

const VM = loadVM()
const run = (params, seed = 1) => resample(parseData(params.a), parseData(params.b),
  {stat: params.stat, method: params.method, N: 10000, rng: VM.sampling.seededRandom(seed)})
const byTitle = title => examples.find(e => e.title === title).params

test('the T-cell table reproduces the medians the notes quote', () => {
  assert.equal(median(tCellA), 59.8)
  assert.equal(median(tCellB), 69.5)
})

test('every example parses', () => {
  for (const {title, params} of examples) {
    assert.ok(parseData(params.a) && parseData(params.b), title)
  }
})

test('T-cell tests: no resample reaches 9.7, so p = 1/10001', () => {
  for (const title of ['T-cell counts: permutation test', 'T-cell counts: re-centered bootstrap test']) {
    const r = run(byTitle(title))
    assert.ok(Math.abs(r.obs - 9.7) < 1e-9)
    assert.equal(pValue(r.deltas, r.obs), 1 / 10001, title)
  }
})

test('T-cell bootstrap interval is about [7.1, 12.0]', () => {
  const r = run(byTitle('T-cell counts: bootstrap interval'))
  const [lo, hi] = percentileInterval(r.deltas)
  assert.ok(Math.abs(lo - 7.1) < 0.5 && Math.abs(hi - 12.0) < 0.5, `[${lo}, ${hi}]`)
})

// The point of the pair: the permutation null is too narrow for these
// groups, so the two tests land on opposite sides of 0.05.
test('unequal spreads: permutation rejects, re-centered bootstrap does not', () => {
  assert.ok(pValue(run(byTitle('Unequal spreads: permutation test')).deltas, 4) < 0.02)
  assert.ok(pValue(run(byTitle('Unequal spreads: re-centered bootstrap')).deltas, 4) > 0.06)
})

test('a permutation uses every pooled value exactly once', () => {
  const r = run(byTitle('8 plates per group'))
  const n = r.nA + r.nB
  for (let k = 0; k < 50; k++) {
    const seen = new Set(r.picks.subarray(k * n, (k + 1) * n))
    assert.equal(seen.size, n)
  }
})

test('a bootstrap resample draws each group only from itself', () => {
  const r = run(byTitle('T-cell counts: bootstrap interval'))
  const n = r.nA + r.nB
  for (let k = 0; k < 50; k++) {
    for (let i = 0; i < n; i++) {
      const p = r.picks[k * n + i]
      assert.equal(i < r.nA, p < r.nA)
    }
  }
})
