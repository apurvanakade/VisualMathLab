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

export const families = [
  {id: "z", name: "z-tests", note: "Standard normal"},
  {id: "t", name: "t-tests", note: "Student's t"},
  {id: "chi2", name: "χ² tests", note: "Chi-squared"},
  {id: "F", name: "F-test", note: "Fisher's F"}
]

// Alternative labels per parameter, shown in the app's "Alternative H₁"
// dropdown.
const alts = (param, null0) => ({
  "two-sided": `${param} ≠ ${null0}`,
  less: `${param} < ${null0}`,
  greater: `${param} > ${null0}`
})

export const tests = [
  {
    id: "z-mean", family: "z", name: "One-sample z-test",
    short: "Mean of one group, σ known",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("μ", "μ₀"),
    defaults: {alt: "two-sided", stat: -2.25},
    example: {mu0: 500, sigma: 4, n: 25, xbar: 498.2}
  },
  {
    id: "z-prop", family: "z", name: "One-proportion z-test",
    short: "Proportion in one group",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("p", "p₀"),
    defaults: {alt: "two-sided", stat: 2.2},
    example: {p0: 0.5, n: 100, x: 61}
  },
  {
    id: "z-2prop", family: "z", name: "Two-proportion z-test",
    short: "Compare proportions of two groups",
    kind: "z", symbol: "z", sizes: [], df: () => [],
    alternatives: alts("p₁ − p₂", "0"),
    defaults: {alt: "greater", stat: 2.41},
    example: {x1: 120, n1: 400, x2: 90, n2: 400}
  },
  {
    id: "t-one", family: "t", name: "One-sample t-test",
    short: "Mean of one group, σ unknown",
    kind: "t", symbol: "t",
    sizes: [{key: "n", label: "Sample size n", min: 2}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("μ", "μ₀"),
    defaults: {alt: "less", n: 16, stat: -2},
    example: {mu0: 8, n: 16, xbar: 7.4, s: 1.2}
  },
  {
    id: "t-paired", family: "t", name: "Paired t-test",
    short: "Before/after on the same subjects",
    kind: "t", symbol: "t",
    sizes: [{key: "n", label: "Number of pairs n", min: 2}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("μ_d", "0"),
    defaults: {alt: "greater", n: 8, stat: 1.94},
    example: {before: [142, 138, 150, 145, 160, 155, 148, 152], after: [138, 140, 141, 143, 155, 154, 151, 145]}
  },
  {
    id: "t-two", family: "t", name: "Two-sample t-test",
    short: "Compare means of two independent groups",
    kind: "t", symbol: "t",
    sizes: [{key: "n1", label: "Group 1 size n₁", min: 2}, {key: "n2", label: "Group 2 size n₂", min: 2}],
    df: s => [s.n1 + s.n2 - 2], dfText: "n₁ + n₂ − 2",
    alternatives: alts("μ₁ − μ₂", "0"),
    defaults: {alt: "two-sided", n1: 12, n2: 10, stat: 1.93},
    example: {n1: 12, xbar1: 78, s1: 8, n2: 10, xbar2: 71, s2: 9}
  },
  {
    id: "chi2-gof", family: "chi2", name: "χ² goodness of fit",
    short: "Do counts match a claimed distribution?",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "k", label: "Categories k", min: 2}],
    df: s => [s.k - 1], dfText: "k − 1",
    alternatives: {greater: "Counts don't fit"},
    defaults: {alt: "greater", k: 6, stat: 9.3},
    example: {observed: [15, 25, 18, 22, 12, 28], probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]}
  },
  {
    id: "chi2-ind", family: "chi2", name: "χ² test of independence",
    short: "Are two categorical variables related?",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "r", label: "Rows r", min: 2}, {key: "c", label: "Columns c", min: 2}],
    df: s => [(s.r - 1) * (s.c - 1)], dfText: "(r − 1)(c − 1)",
    alternatives: {greater: "Variables are related"},
    defaults: {alt: "greater", r: 2, c: 3, stat: 8.82},
    example: {table: [[32, 13, 15], [18, 27, 15]]}
  },
  {
    id: "chi2-var", family: "chi2", name: "χ² test for a variance",
    short: "Variance of one group",
    kind: "chi2", symbol: "χ²",
    sizes: [{key: "n", label: "Sample size n", min: 2}],
    df: s => [s.n - 1], dfText: "n − 1",
    alternatives: alts("σ²", "σ₀²"),
    defaults: {alt: "greater", n: 20, stat: 32.11},
    example: {sigma0: 0.02, n: 20, s: 0.026}
  },
  {
    id: "f-var", family: "F", name: "F-test for two variances",
    short: "Compare variances of two groups",
    kind: "F", symbol: "F",
    sizes: [{key: "n1", label: "Group 1 size n₁", min: 2}, {key: "n2", label: "Group 2 size n₂", min: 2}],
    df: s => [s.n1 - 1, s.n2 - 1], dfText: "n₁ − 1, n₂ − 1",
    alternatives: alts("σ₁² / σ₂²", "1"),
    defaults: {alt: "two-sided", n1: 13, n2: 16, stat: 2.34},
    example: {n1: 13, s1: 5.2, n2: 16, s2: 3.4}
  }
]

export const testById = new Map(tests.map(t => [t.id, t]))

// The null distribution of a test's statistic, as the {cdf, quantile} pair
// VM.distributions.hypothesisTest takes plus the pdf the chart draws, and a
// fixed plotting window [lo, hi] that depends only on the distribution, so
// moving the observed statistic or alpha never rescales the chart. For a
// skewed distribution the window reaches far enough to show the upper
// tail's critical region at any alpha the slider allows.
export function nullDistribution(kind, dfs = []) {
  const D = globalThis.VM.distributions
  const [a, b] = dfs
  if (kind === "z") {
    return {lo: -4.5, hi: 4.5, pdf: x => D.normalPdf(x, 0, 1), cdf: x => D.normalCdf(x), quantile: p => D.normalQuantile(p)}
  }
  if (kind === "t") {
    return {lo: -5, hi: 5, pdf: x => D.studentTPdf(x, a), cdf: x => D.studentTCdf(x, a), quantile: p => D.studentTQuantile(p, a)}
  }
  if (kind === "chi2") {
    return {
      lo: 0, hi: niceCeil(D.chiSquaredQuantile(0.9995, a)),
      pdf: x => D.chiSquaredPdf(x, a), cdf: x => D.chiSquaredCdf(x, a), quantile: p => D.chiSquaredQuantile(p, a)
    }
  }
  if (kind === "F") {
    return {
      lo: 0, hi: Math.min(niceCeil(D.fQuantile(0.995, a, b)), 50),
      pdf: x => D.fPdf(x, a, b), cdf: x => D.fCdf(x, a, b), quantile: p => D.fQuantile(p, a, b)
    }
  }
  throw new Error(`unknown distribution ${kind}`)
}

// Rounds a plotting bound up to a round number, so the window's edge lands
// on or near a tick.
function niceCeil(x) {
  if (!(x > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= x) return m * p
  return 10 * p
}
