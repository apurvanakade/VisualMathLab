/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Sample autocorrelation function of a series, the standard MCMC mixing
   * diagnostic: `acf[k]` is the correlation between `x[t]` and `x[t + k]`,
   * using the whole-series mean and the lag-0 sum of squares as the
   * denominator (the biased estimator, so every value lies in `[-1, 1]`).
   *
   * @param {number[]} values - The series, e.g. one coordinate of a chain.
   * @param {number} [maxLag=50] - Largest lag returned; capped at
   *   `values.length - 1`.
   * @returns {number[]} `acf[0..maxLag]`, with `acf[0] = 1`. A constant
   *   series (zero variance) returns `[1, 0, 0, ...]` rather than `NaN`s,
   *   and an empty or one-element series returns `[1]`.
   */
  const autocorrelation = (values, maxLag = 50) => {
    const n = values.length
    if (n < 2) return [1]

    let mean = 0
    for (const v of values) mean += v
    mean /= n

    let denom = 0
    for (const v of values) denom += (v - mean) * (v - mean)

    const lagMax = Math.min(maxLag, n - 1)
    const out = new Array(lagMax + 1).fill(0)
    out[0] = 1
    if (!(denom > 1e-12)) return out

    for (let lag = 1; lag <= lagMax; lag++) {
      let num = 0
      for (let t = lag; t < n; t++) num += (values[t] - mean) * (values[t - lag] - mean)
      out[lag] = num / denom
    }
    return out
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, autocorrelation}}
})(window)
