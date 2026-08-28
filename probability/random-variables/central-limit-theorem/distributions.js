/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // A small library of named probability distributions for the Central
  // Limit Theorem app. Each entry carries a sampler plus the analytic
  // mean, variance, skewness, and excess kurtosis — the app standardizes
  // draws with (mean, variance) and plots the exact non-normality decay
  // curves gamma1/sqrt(n) and gamma2/n against the simulated ones using
  // (skewness, excessKurtosis).
  //
  // Colocated with this one page per CLAUDE.md's "one page => colocate,
  // page-level include-in-header" rule (same as
  // piecewise-interpolation/linear-cubic/cubic-spline.js). Promote to a
  // nested js/distributions/ category when a second random-variables page
  // needs it.
  //
  // Every sample(rng) takes a uniform () => [0, 1) generator and returns
  // one draw. Distributions that need Gaussian noise build it inline via
  // Box-Muller rather than depending on VM.sampling.gaussianRandom, so
  // this file stays self-contained and unit-testable on its own.

  const TWO_PI = 2 * Math.PI

  // One standard-normal draw from two uniforms (Box-Muller).
  const normalFrom = (rng) => {
    const u1 = Math.max(rng(), 1e-12)
    const u2 = rng()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TWO_PI * u2)
  }

  // Knuth's algorithm for a Poisson draw with mean lambda (fine for the
  // small lambda used here).
  const poissonFrom = (rng, lambda) => {
    const threshold = Math.exp(-lambda)
    let k = 0
    let product = 1
    do {
      k++
      product *= rng()
    } while (product > threshold)
    return k - 1
  }

  // --- Bernoulli(p = 0.05) moments ---
  const rareP = 0.05
  const rareQ = 1 - rareP
  const rareVar = rareP * rareQ
  const rareSkew = (1 - 2 * rareP) / Math.sqrt(rareVar)
  const rareExcessKurtosis = (1 - 6 * rareP * rareQ) / rareVar

  // --- Bimodal mixture: 0.5 * N(-2, 0.5^2) + 0.5 * N(+2, 0.5^2) ---
  // Symmetric, so mean 0 and skewness 0. Variance = component variance +
  // spread of the component means = 0.25 + 4 = 4.25. Fourth central
  // moment: each component contributes E[X^4] = mu^4 + 6 mu^2 sigma^2 +
  // 3 sigma^4 = 16 + 6 + 0.1875 = 22.1875, so the mixture's is the same.
  const bimodalVar = 0.25 + 4
  const bimodalFourthMoment = 16 + 6 * 4 * 0.25 + 3 * 0.25 * 0.25
  const bimodalExcessKurtosis = bimodalFourthMoment / (bimodalVar * bimodalVar) - 3

  // --- Log-normal from exp(N(0, s^2)) with s = 0.5 ---
  const lnS2 = 0.25
  const lnMean = Math.exp(lnS2 / 2)
  const lnVar = (Math.exp(lnS2) - 1) * Math.exp(lnS2)
  const lnSkew = (Math.exp(lnS2) + 2) * Math.sqrt(Math.exp(lnS2) - 1)
  const lnExcessKurtosis =
    Math.exp(4 * lnS2) + 2 * Math.exp(3 * lnS2) + 3 * Math.exp(2 * lnS2) - 6

  const distributions = {
    uniform: {
      label: "Uniform(0, 1)",
      mean: 0.5,
      variance: 1 / 12,
      skewness: 0,
      excessKurtosis: -6 / 5,
      sample: (rng) => rng()
    },
    exponential: {
      label: "Exponential(λ = 1)",
      mean: 1,
      variance: 1,
      skewness: 2,
      excessKurtosis: 6,
      sample: (rng) => -Math.log(Math.max(rng(), 1e-12))
    },
    bernoulliFair: {
      label: "Bernoulli(p = 0.5)",
      mean: 0.5,
      variance: 0.25,
      skewness: 0,
      excessKurtosis: -2,
      sample: (rng) => (rng() < 0.5 ? 1 : 0)
    },
    bernoulliRare: {
      label: "Bernoulli(p = 0.05)",
      mean: rareP,
      variance: rareVar,
      skewness: rareSkew,
      excessKurtosis: rareExcessKurtosis,
      sample: (rng) => (rng() < rareP ? 1 : 0)
    },
    poisson: {
      label: "Poisson(λ = 2)",
      mean: 2,
      variance: 2,
      skewness: 1 / Math.sqrt(2),
      excessKurtosis: 1 / 2,
      sample: (rng) => poissonFrom(rng, 2)
    },
    bimodal: {
      label: "Bimodal mixture",
      mean: 0,
      variance: bimodalVar,
      skewness: 0,
      excessKurtosis: bimodalExcessKurtosis,
      sample: (rng) => {
        const center = rng() < 0.5 ? -2 : 2
        return center + 0.5 * normalFrom(rng)
      }
    },
    lognormal: {
      label: "Log-normal(σ = 0.5)",
      mean: lnMean,
      variance: lnVar,
      skewness: lnSkew,
      excessKurtosis: lnExcessKurtosis,
      sample: (rng) => Math.exp(0.5 * normalFrom(rng))
    }
  }

  // Fixed display order — the CLT page's Inputs.select and its URL "dist"
  // param both iterate this so a shared link round-trips to the same
  // option.
  const distributionOrder = [
    "uniform",
    "exponential",
    "bernoulliFair",
    "bernoulliRare",
    "poisson",
    "bimodal",
    "lognormal"
  ]

  globalThis.VM = {
    ...globalThis.VM,
    distributions,
    distributionOrder
  }
})(window)
