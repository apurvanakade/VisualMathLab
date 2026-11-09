/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The catalog of tests the page offers. Each entry says which null
// distribution its statistic has, how the degrees of freedom come from the
// sample sizes, which alternatives make sense, and the page's starting
// state for it -- which is its worked example (the prose in index.qmd shows
// the same numbers; tests.test.js recomputes each statistic from the
// example's data, and each p-value, so the two can't drift apart). All the
// distribution math is mathviz's VM.distributions. The long-form explanation
// of each test (assumptions, formulas, decision rule) is Markdown in
// index.qmd, keyed by the same id.

// Alternative labels per parameter, shown in the app's "Alternative H₁"
// dropdown.
const alts = (param, null0) => ({
  "two-sided": `${param} ≠ ${null0}`,
  greater: `${param} > ${null0}`,
  less: `${param} < ${null0}`
})

// Each test's `group` is the heading it sits under in the app's Test
// dropdown; tests of one group are listed together.
export const tests = [
  {
    id: "z-mean", group: "z-tests (standard normal)", name: "One-sample z-test",
    short: "Mean of one group, σ known",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("μ", "μ₀"),
    defaults: {alt: "two-sided", stat: -2.25},
    example: {mu0: 500, sigma: 4, n: 25, xbar: 498.2}
  },
  {
    id: "z-prop", group: "z-tests (standard normal)", name: "One-proportion z-test",
    short: "Proportion in one group",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("p", "p₀"),
    defaults: {alt: "two-sided", stat: 2.2},
    example: {p0: 0.5, n: 100, x: 61}
  },
  {
    id: "z-2prop", group: "z-tests (standard normal)", name: "Two-proportion z-test",
    short: "Compare proportions of two groups",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("p₁ − p₂", "0"),
    defaults: {alt: "greater", stat: 2.41},
    example: {x1: 120, n1: 400, x2: 90, n2: 400}
  },
  {
    id: "t-one", group: "t-tests (Student's t)", name: "One-sample t-test",
    short: "Mean of one group, σ unknown",
    kind: "t", symbol: "t",
    sizes: [{key: "n", label: "Sample size n", min: 2, max: 60}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("μ", "μ₀"),
    defaults: {alt: "less", n: 16, stat: -2},
    example: {mu0: 8, n: 16, xbar: 7.4, s: 1.2}
  },
  {
    id: "t-paired", group: "t-tests (Student's t)", name: "Paired t-test",
    short: "Before/after on the same subjects",
    kind: "t", symbol: "t",
    sizes: [{key: "n", label: "Number of pairs n", min: 2, max: 60}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("μ_d", "0"),
    defaults: {alt: "greater", n: 8, stat: 1.94},
    example: {before: [142, 138, 150, 145, 160, 155, 148, 152], after: [138, 140, 141, 143, 155, 154, 151, 145]}
  },
  {
    id: "t-two", group: "t-tests (Student's t)", name: "Two-sample t-test",
    short: "Compare means of two independent groups",
    kind: "t", symbol: "t",
    sizes: [{key: "n1", label: "Group 1 size n₁", min: 2, max: 60}, {key: "n2", label: "Group 2 size n₂", min: 2, max: 60}],
    df: s => [s.n1 + s.n2 - 2], dfText: "n₁ + n₂ − 2",
    alternatives: alts("μ₁ − μ₂", "0"),
    defaults: {alt: "two-sided", n1: 12, n2: 10, stat: 1.93},
    example: {n1: 12, xbar1: 78, s1: 8, n2: 10, xbar2: 71, s2: 9}
  },
  {
    id: "chi2-gof", group: "χ² tests (chi-squared)", name: "χ² goodness of fit",
    short: "Do counts match a claimed distribution?",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "k", label: "Categories k", min: 2, max: 12}],
    df: s => [s.k - 1], dfText: "k − 1",
    alternatives: {greater: "Counts don't fit"},
    defaults: {alt: "greater", k: 6, stat: 9.3},
    example: {observed: [15, 25, 18, 22, 12, 28], probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]}
  },
  {
    id: "chi2-ind", group: "χ² tests (chi-squared)", name: "χ² test of independence",
    short: "Are two categorical variables related?",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "r", label: "Rows r", min: 2, max: 6}, {key: "c", label: "Columns c", min: 2, max: 6}],
    df: s => [(s.r - 1) * (s.c - 1)], dfText: "(r − 1)(c − 1)",
    alternatives: {greater: "Variables are related"},
    defaults: {alt: "greater", r: 2, c: 3, stat: 8.82},
    example: {table: [[32, 13, 15], [18, 27, 15]]}
  },
  {
    id: "chi2-var", group: "χ² tests (chi-squared)", name: "χ² test for a variance",
    short: "Variance of one group",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "n", label: "Sample size n", min: 2, max: 60}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("σ²", "σ₀²"),
    defaults: {alt: "greater", n: 20, stat: 32.11},
    example: {sigma0: 0.02, n: 20, s: 0.026}
  },
  {
    id: "f-var", group: "F-test (Fisher's F)", name: "F-test for two variances",
    short: "Compare variances of two groups",
    kind: "F", symbol: "F",
    sizes: [{key: "n1", label: "Group 1 size n₁", min: 2, max: 60}, {key: "n2", label: "Group 2 size n₂", min: 2, max: 60}],
    df: s => [s.n1 - 1, s.n2 - 1], dfText: "n₁ − 1, n₂ − 1",
    alternatives: alts("σ₁² / σ₂²", "1"),
    defaults: {alt: "two-sided", n1: 13, n2: 16, stat: 2.34},
    example: {n1: 13, s1: 5.2, n2: 16, s2: 3.4}
  }
]

export const testById = new Map(tests.map(t => [t.id, t]))

// The null distribution of a test's statistic at the given sample sizes,
// as the {cdf, quantile} pair VM.distributions.hypothesisTest takes plus
// the pdf the chart draws.
export function nullDistribution(test, sizes) {
  const D = globalThis.VM.distributions
  const [a, b] = test.df(sizes)
  switch (test.kind) {
    case "z": return {pdf: x => D.normalPdf(x, 0, 1), cdf: x => D.normalCdf(x), quantile: p => D.normalQuantile(p)}
    case "t": return {pdf: x => D.studentTPdf(x, a), cdf: x => D.studentTCdf(x, a), quantile: p => D.studentTQuantile(p, a)}
    case "chi2": return {pdf: x => D.chiSquaredPdf(x, a), cdf: x => D.chiSquaredCdf(x, a), quantile: p => D.chiSquaredQuantile(p, a)}
    case "F": return {pdf: x => D.fPdf(x, a, b), cdf: x => D.fCdf(x, a, b), quantile: p => D.fQuantile(p, a, b)}
  }
  throw new Error(`unknown distribution ${test.kind}`)
}

// The chart's fixed window for a test: x from lo to hi and y from 0 to
// yMax, the same at every sample size the sliders allow, so moving any
// slider never rescales the axes. x reaches the 99.95% point at the
// largest df (chi-squared) or a fixed 8 (F, whose small-df tails are too
// long to fit); y fits the tallest curve over the slider's range, ignoring
// the first 3% of a [0, hi] window, where a chi-squared or F density with
// 1 or 2 numerator df is unbounded. A t chart is sized for the standard
// normal it's drawn against, which is taller than any t.
const windows = new Map()
export function plotWindow(test) {
  if (windows.has(test.id)) return windows.get(test.id)
  const D = globalThis.VM.distributions
  const normalPeak = 1 / Math.sqrt(2 * Math.PI)
  let win
  if (test.kind === "z") win = {lo: -4.5, hi: 4.5, yMax: normalPeak * 1.18}
  else if (test.kind === "t") win = {lo: -5, hi: 5, yMax: normalPeak * 1.18}
  else {
    const maxSizes = Object.fromEntries(test.sizes.map(sz => [sz.key, sz.max]))
    const minSizes = Object.fromEntries(test.sizes.map(sz => [sz.key, sz.min]))
    const [maxA, maxB] = test.df(maxSizes)
    const [minA, minB] = test.df(minSizes)
    const hi = test.kind === "chi2" ? niceCeil(D.chiSquaredQuantile(0.9995, maxA)) : 8
    // Every df for chi-squared; a spread of df pairs for F.
    const spread = (lo, hi) => [...new Set([1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 45, 60, 90, 120]
      .filter(v => v >= lo && v <= hi).concat([lo, hi]))]
    const pairs = test.kind === "chi2"
      ? Array.from({length: maxA - minA + 1}, (_, i) => [minA + i])
      : spread(minA, maxA).flatMap(a => spread(minB, maxB).map(b => [a, b]))
    let peak = 0
    for (const [a, b] of pairs) {
      const pdf = test.kind === "chi2" ? x => D.chiSquaredPdf(x, a) : x => D.fPdf(x, a, b)
      for (let i = 0; i <= 200; i++) {
        const x = hi * (0.03 + 0.97 * i / 200)
        const y = pdf(x)
        if (Number.isFinite(y)) peak = Math.max(peak, y)
      }
    }
    win = {lo: 0, hi, yMax: peak * 1.18}
  }
  windows.set(test.id, win)
  return win
}

// Rounds a plotting bound up to a round number, so the window's edge lands
// on or near a tick.
function niceCeil(x) {
  if (!(x > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= x) return m * p
  return 10 * p
}
