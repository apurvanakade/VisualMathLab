/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The page's examples and its three resampling schemes. No DOM and no OJS:
// the page imports from here, and method.test.js runs it under Node.

// Hypothetical T-cell counts per unit area (Garfinkel & Guo, Understanding
// Data, Table 6.1). Medians: control 59.8, treatment 69.5.
export const tCellA = [
  53.2, 54.6, 55.1, 55.4, 55.8, 56.2, 55.7, 56.5, 56.6, 56.9, 57.2, 56.7,
  57.9, 57.6, 57.8, 58.5, 58.9, 59.0, 59.1, 58.7, 58.6, 58.8, 59.7, 59.4,
  59.8, 60.1, 60.8, 60.5, 61.0, 61.7, 61.3, 61.9, 61.5, 62.8, 62.5, 62.6,
  62.9, 63.5, 63.8, 65.5, 65.1, 64.9, 65.2, 66.0, 67.9, 67.8, 68.1, 69.5,
  70.0
]
export const tCellB = [
  57.9, 59.6, 61.0, 61.6, 62.4, 62.8, 63.1, 64.0, 64.7, 65.2, 65.9, 66.2,
  66.4, 66.5, 68.4, 68.9, 68.3, 67.8, 67.7, 68.0, 69.0, 68.8, 69.5, 70.0,
  70.1, 70.8, 71.2, 71.3, 72.0, 72.1, 71.1, 70.5, 71.1, 71.9, 71.5, 72.5,
  73.1, 73.3, 72.8, 73.8, 73.5, 74.9, 75.2, 76.2, 75.8
]

// Every sixth plate of each group: small enough that the permutation null
// reaches the observed difference now and then.
const every6th = values => values.filter((_, i) => i % 6 === 0)

// Very different spreads and group sizes: a tight group of 40 (SD 0.5,
// mean 50.0) and a wide group of 10 (SD 10, mean 54.0). Pooling them makes
// the permutation null far narrower than the real sampling spread of the
// difference in means, so it calls the 4.0 difference significant
// (p ≈ 0.008); the re-centered bootstrap keeps each group's own spread and
// does not (p ≈ 0.1).
export const spreadA = [
  49.3, 49.4, 50.4, 49.8, 50.1, 49.5, 49.7, 50.9, 49.1, 50.2, 50.0, 49.4,
  49.4, 50.2, 49.6, 49.5, 49.7, 49.5, 50.6, 50.0, 50.5, 50.0, 50.3, 50.5,
  49.8, 50.1, 50.1, 50.2, 51.2, 50.2, 50.0, 50.7, 50.7, 49.9, 50.8, 50.0,
  49.9, 49.7, 49.1, 50.0
]
export const spreadB = [60.2, 44.3, 30.2, 50.1, 51.5, 57.7, 57.2, 62.5, 64.7, 61.6]

const list = values => values.map(v => v.toFixed(1)).join(", ")

export const statLabels = new Map([
  ["median", "Median"],
  ["mean", "Mean"],
  ["trimmed", "10% trimmed mean"]
])

export const methodLabels = new Map([
  ["permutation", "Permutation test"],
  ["recentered", "Re-centered bootstrap test"],
  ["interval", "Bootstrap interval"]
])

export const examples = [
  {title: "T-cell counts: permutation test", params: {a: list(tCellA), b: list(tCellB), stat: "median", method: "permutation"}},
  {title: "T-cell counts: re-centered bootstrap test", params: {a: list(tCellA), b: list(tCellB), stat: "median", method: "recentered"}},
  {title: "T-cell counts: bootstrap interval", params: {a: list(tCellA), b: list(tCellB), stat: "median", method: "interval"}},
  {title: "T-cell counts: difference in means", params: {a: list(tCellA), b: list(tCellB), stat: "mean", method: "permutation"}},
  {title: "8 plates per group", params: {a: list(every6th(tCellA)), b: list(every6th(tCellB)), stat: "median", method: "permutation"}},
  {title: "Unequal spreads: permutation test", params: {a: list(spreadA), b: list(spreadB), stat: "mean", method: "permutation"}},
  {title: "Unequal spreads: re-centered bootstrap", params: {a: list(spreadA), b: list(spreadB), stat: "mean", method: "recentered"}}
]

// A comma- or space-separated list of numbers, or null if any entry isn't
// one (or there are fewer than two).
export function parseData (text) {
  const parts = String(text).split(/[\s,;]+/).filter(s => s !== "")
  const values = parts.map(Number)
  if (values.length < 2 || values.some(v => !Number.isFinite(v))) return null
  return values
}

function sortedCopy (values) {
  return Float64Array.from(values).sort()
}

export function median (values) {
  const s = sortedCopy(values)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function mean (values) {
  let total = 0
  for (const v of values) total += v
  return total / values.length
}

// Drops floor(10%) of the values from each end, then averages the rest.
export function trimmedMean (values) {
  const s = sortedCopy(values)
  const cut = Math.floor(s.length * 0.1)
  let total = 0
  for (let i = cut; i < s.length - cut; i++) total += s[i]
  return total / (s.length - 2 * cut)
}

export const statistics = {median, mean, trimmed: trimmedMean}

// The q-quantile of an already sorted array, interpolating linearly between
// order statistics (numpy's default, R's type 7).
export function quantileSorted (sorted, q) {
  const h = (sorted.length - 1) * q
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, sorted.length - 1)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

/**
 * N resamples of the two groups, the statistic of each, and enough to
 * redraw any one of them.
 *
 * - "permutation": shuffle the pooled values; the first nA are A*, the rest B*.
 * - "recentered": subtract each group's own statistic, then draw nA values
 *   with replacement from A's and nB from B's.
 * - "interval": draw with replacement from each original group.
 *
 * @returns {{obs, deltas: Float64Array, picks: Uint16Array, nA, nB}} where
 *   resample k's values are `picks[k*(nA+nB) ...]`: indices into the pooled
 *   array [...A, ...B] (for both bootstrap schemes, A* picks from 0..nA-1 and
 *   B* from nA..nA+nB-1).
 */
export function resample (A, B, {stat = "median", method = "permutation", N = 10000, rng}) {
  const statistic = statistics[stat]
  const nA = A.length, nB = B.length, n = nA + nB
  const pooled = [...A, ...B]
  const obs = statistic(B) - statistic(A)
  const shiftA = method === "recentered" ? statistic(A) : 0
  const shiftB = method === "recentered" ? statistic(B) : 0

  const deltas = new Float64Array(N)
  const picks = new Uint16Array(N * n)
  const order = Uint16Array.from({length: n}, (_, i) => i)
  const a = new Float64Array(nA), b = new Float64Array(nB)

  for (let k = 0; k < N; k++) {
    const base = k * n
    if (method === "permutation") {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const t = order[i]; order[i] = order[j]; order[j] = t
      }
      for (let i = 0; i < n; i++) picks[base + i] = order[i]
    } else {
      for (let i = 0; i < nA; i++) picks[base + i] = Math.floor(rng() * nA)
      for (let i = 0; i < nB; i++) picks[base + nA + i] = nA + Math.floor(rng() * nB)
    }
    for (let i = 0; i < nA; i++) {
      const p = picks[base + i]
      a[i] = pooled[p] - (p < nA ? shiftA : shiftB)
    }
    for (let i = 0; i < nB; i++) {
      const p = picks[base + nA + i]
      b[i] = pooled[p] - (p < nA ? shiftA : shiftB)
    }
    deltas[k] = statistic(b) - statistic(a)
  }
  return {obs, deltas, picks, nA, nB}
}

// Monte Carlo p-value over the first k resamples, with the +1 that counts
// the observed data as one of them (Phipson & Smyth, 2010).
export function pValue (deltas, obs, k = deltas.length) {
  let count = 0
  for (let i = 0; i < k; i++) if (deltas[i] >= obs - 1e-9) count++
  return (1 + count) / (k + 1)
}

// The 95% percentile interval of the first k resamples.
export function percentileInterval (deltas, k = deltas.length, level = 0.95) {
  const s = Float64Array.from(deltas.subarray(0, k)).sort()
  return [quantileSorted(s, (1 - level) / 2), quantileSorted(s, (1 + level) / 2)]
}

// A dot plot's stacking: for each value, how many earlier values fell in
// the same bin of width binWidth (so the dot sits that many steps up).
export function stackLevels (values, binWidth) {
  const seen = new Map()
  const levels = new Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const bin = Math.round(values[i] / binWidth)
    const level = seen.get(bin) ?? 0
    levels[i] = level
    seen.set(bin, level + 1)
  }
  return levels
}
