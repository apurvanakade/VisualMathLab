/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Running (cumulative) mean of a series: `out[i]` is the average of
   * `values[0..i]`. The quantity every Monte Carlo estimate converges
   * through, so it is what a convergence plot draws.
   *
   * @param {number[]} values
   * @returns {number[]} Same length as `values`; `[]` for an empty series.
   *   Non-finite entries are not skipped: one `NaN` makes every later mean
   *   `NaN`.
   */
  const runningMean = (values) => {
    const out = []
    let sum = 0
    for (let i = 0; i < values.length; i++) {
      sum += values[i]
      out.push(sum / (i + 1))
    }
    return out
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, runningMean}}
})(window)
