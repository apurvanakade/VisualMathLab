/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The page's examples and its coverage experiment. No DOM and no OJS: the
// page imports from here, and method.test.js runs it under Node.

const Z90 = 1.2815515655446004 // the standard normal's 90th percentile

// Each population: a sampler (given a uniform rng) and the true value of
// each statistic. A statistic the population doesn't have (the maximum of
// an unbounded one) is Infinity.
export const populations = {
  lognormal: {
    label: "Lognormal(0, 1)",
    draw: (rng) => Math.exp(normal(rng)),
    truth: {mean: Math.exp(0.5), median: 1, q90: Math.exp(Z90), max: Infinity}
  },
  normal: {
    label: "Normal(0, 1)",
    draw: (rng) => normal(rng),
    truth: {mean: 0, median: 0, q90: Z90, max: Infinity}
  },
  exponential: {
    label: "Exponential(1)",
    draw: (rng) => -Math.log(1 - rng()),
    truth: {mean: 1, median: Math.LN2, q90: Math.LN10, max: Infinity}
  },
  uniform: {
    label: "Uniform(0, 1)",
    draw: (rng) => rng(),
    truth: {mean: 0.5, median: 0.5, q90: 0.9, max: 1}
  }
}

// Box-Muller, one draw per call.
function normal (rng) {
  const u1 = Math.max(rng(), 1e-300)
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rng())
}

export const statLabels = new Map([
  ["median", "Median"],
  ["mean", "Mean"],
  ["q90", "90th percentile"],
  ["max", "Maximum"]
])

export const populationLabels = new Map(Object.entries(populations).map(([key, p]) => [key, p.label]))

export const examples = [
  {title: "Median of a lognormal, n = 30", params: {pop: "lognormal", stat: "median", n: "30"}},
  {title: "Mean of a lognormal, n = 10", params: {pop: "lognormal", stat: "mean", n: "10"}},
  {title: "Mean of a lognormal, n = 100", params: {pop: "lognormal", stat: "mean", n: "100"}},
  {title: "90th percentile of a lognormal, n = 10", params: {pop: "lognormal", stat: "q90", n: "10"}},
  {title: "90th percentile of a lognormal, n = 100", params: {pop: "lognormal", stat: "q90", n: "100"}},
  {title: "Mean of a normal, n = 30", params: {pop: "normal", stat: "mean", n: "30"}},
  {title: "Maximum of a uniform, n = 50", params: {pop: "uniform", stat: "max", n: "50"}}
]

// The q-quantile of an already sorted array, interpolating linearly between
// order statistics (numpy's default, R's type 7).
export function quantileSorted (sorted, q) {
  const h = (sorted.length - 1) * q
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, sorted.length - 1)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

// The statistic of `values`, a Float64Array it may sort in place.
export function statistic (stat, values) {
  if (stat === "mean") {
    let total = 0
    for (const v of values) total += v
    return total / values.length
  }
  if (stat === "max") {
    let best = -Infinity
    for (const v of values) if (v > best) best = v
    return best
  }
  values.sort()
  return quantileSorted(values, stat === "median" ? 0.5 : 0.9)
}

/**
 * R independent samples of size n from the population, and a percentile
 * bootstrap interval (N resamples, at `level`) from each.
 *
 * @returns {{truth: number, intervals: Array<{lo, hi, estimate, hit}>}}
 */
export function coverageRun ({pop, stat, n, R, N, level = 0.95, rng}) {
  const population = populations[pop]
  const truth = population.truth[stat]
  const sample = new Float64Array(n)
  const scratch = new Float64Array(n)
  const boot = new Float64Array(N)
  const intervals = []
  for (let r = 0; r < R; r++) {
    for (let i = 0; i < n; i++) sample[i] = population.draw(rng)
    scratch.set(sample)
    const estimate = statistic(stat, scratch)
    for (let b = 0; b < N; b++) {
      for (let i = 0; i < n; i++) scratch[i] = sample[Math.floor(rng() * n)]
      boot[b] = statistic(stat, scratch)
    }
    boot.sort()
    const lo = quantileSorted(boot, (1 - level) / 2)
    const hi = quantileSorted(boot, (1 + level) / 2)
    intervals.push({lo, hi, estimate, hit: lo <= truth && truth <= hi})
  }
  return {truth, intervals}
}
