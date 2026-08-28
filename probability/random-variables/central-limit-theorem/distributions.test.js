/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

// Colocated with distributions.js (which is a page-level include, not part
// of _includes/head-scripts.html), so this loads the file directly rather
// than through scripts/load-vm.mjs. `npm test` (node --test) still
// discovers it automatically by the *.test.js name.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
globalThis.window = globalThis
;(0, eval)(fs.readFileSync(path.join(here, 'distributions.js'), 'utf8'))

const { distributions, distributionOrder } = globalThis.VM

// Deterministic mulberry32 PRNG so the moment checks below are stable
// across runs (the same generator js/sampling/seeded-random.js ships, kept
// local here to keep this test self-contained).
function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function moments(samples) {
  const n = samples.length
  let sum = 0
  for (const x of samples) sum += x
  const mean = sum / n

  let m2 = 0
  let m3 = 0
  let m4 = 0
  for (const x of samples) {
    const d = x - mean
    const d2 = d * d
    m2 += d2
    m3 += d2 * d
    m4 += d2 * d2
  }
  m2 /= n
  m3 /= n
  m4 /= n

  const sd = Math.sqrt(m2)
  return {
    mean,
    variance: m2,
    skewness: m3 / (sd * sd * sd),
    excessKurtosis: m4 / (m2 * m2) - 3
  }
}

test('distributionOrder lists every distribution exactly once', () => {
  assert.deepEqual([...distributionOrder].sort(), Object.keys(distributions).sort())
})

// Kurtosis of a single sample is a very high-variance estimator for
// heavy-tailed laws — check it only where it is well-behaved enough at
// this sample size.
const kurtosisIsStable = new Set([
  'uniform',
  'bernoulliFair',
  'bernoulliRare',
  'poisson',
  'bimodal'
])

for (const slug of distributionOrder) {
  test(`${slug}: empirical moments match the analytic ones`, () => {
    const dist = distributions[slug]
    const rng = mulberry32(0x9e3779b9)
    const count = 300000
    const samples = new Array(count)
    for (let i = 0; i < count; i++) samples[i] = dist.sample(rng)

    const m = moments(samples)
    const sd = Math.sqrt(dist.variance)

    // Standard error of the mean is sd/sqrt(count); allow ~5 of them plus
    // a small floor.
    assert.ok(
      Math.abs(m.mean - dist.mean) < 5 * sd / Math.sqrt(count) + 1e-3,
      `${slug} mean: empirical ${m.mean} vs analytic ${dist.mean}`
    )

    assert.ok(
      Math.abs(m.variance - dist.variance) / dist.variance < 0.06,
      `${slug} variance: empirical ${m.variance} vs analytic ${dist.variance}`
    )

    assert.ok(
      Math.abs(m.skewness - dist.skewness) < 0.25 + 0.2 * Math.abs(dist.skewness),
      `${slug} skewness: empirical ${m.skewness} vs analytic ${dist.skewness}`
    )

    if (kurtosisIsStable.has(slug)) {
      assert.ok(
        Math.abs(m.excessKurtosis - dist.excessKurtosis) <
          0.6 + 0.3 * Math.abs(dist.excessKurtosis),
        `${slug} excess kurtosis: empirical ${m.excessKurtosis} vs analytic ${dist.excessKurtosis}`
      )
    }
  })
}
