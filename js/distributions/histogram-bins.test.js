/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { histogramBins } = VM.distributions

test('histogramBins returns the requested number of bins and edges', () => {
  const samples = Array.from({length: 1000}, (_, i) => i % 50)
  const result = histogramBins(samples, 20)
  assert.equal(result.centers.length, 20)
  assert.equal(result.densities.length, 20)
  assert.equal(result.edges.length, 21)
})

test('histogramBins densities integrate to approximately 1', () => {
  const samples = []
  let seed = 12345
  for (let i = 0; i < 5000; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    samples.push((seed % 1000) / 100)
  }
  const result = histogramBins(samples, 30)
  const width = result.edges[1] - result.edges[0]
  let area = 0
  for (const d of result.densities) area += d * width
  assert.ok(Math.abs(area - 1) < 1e-9, `expected area near 1, got ${area}`)
})

test('histogramBins handles an empty sample array', () => {
  const result = histogramBins([], 10)
  assert.deepEqual(result, {edges: [], centers: [], densities: []})
})

test('histogramBins handles all-identical samples without dividing by zero', () => {
  const result = histogramBins([5, 5, 5, 5], 4)
  assert.equal(result.centers.length, 4)
  for (const d of result.densities) assert.ok(Number.isFinite(d))
})

test('an explicit range aligns bins to integer values, one bin per integer', () => {
  const samples = [3, 3, 4, 4, 4, 5]
  const result = histogramBins(samples, 3, {lo: 2.5, hi: 5.5})
  assert.deepEqual(result.centers, [3, 4, 5])
  assert.equal(result.edges[0], 2.5)
  assert.equal(result.edges[3], 5.5)
  // 2 samples in the k=3 bin, 3 in k=4, 1 in k=5, out of 6 total, width 1
  assert.ok(Math.abs(result.densities[0] - 2 / 6) < 1e-12)
  assert.ok(Math.abs(result.densities[1] - 3 / 6) < 1e-12)
  assert.ok(Math.abs(result.densities[2] - 1 / 6) < 1e-12)
})
