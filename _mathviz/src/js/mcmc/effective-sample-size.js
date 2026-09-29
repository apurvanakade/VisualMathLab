/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Effective sample size of a correlated series,
   * `n / (1 + 2 * (rho_1 + rho_2 + ...))`, summing the autocorrelations
   * up to (not including) the first one that is `<= 0`. Truncating there is
   * what keeps the noisy tail of the ACF from swamping the sum; it is the
   * initial-positive-sequence rule in its simplest form.
   *
   * @param {number[]} values - The series, e.g. one coordinate of a chain.
   * @param {number} [maxLag=1000] - Largest lag the sum may reach.
   * @returns {number} A value in `(0, n]` for positively correlated
   *   chains. Never more than `n`: a chain whose lag-1 autocorrelation is
   *   already negative counts as independent. `0` for an empty series.
   *   `NaN` for a chain that never moves (every value equal): its
   *   autocorrelation is undefined, and reporting `n` would call the worst
   *   possible chain a perfectly mixing one.
   */
  const effectiveSampleSize = (values, maxLag = 1000) => {
    const n = values.length
    if (n < 2) return n

    let moved = false
    for (const v of values) {
      if (v !== values[0]) {
        moved = true
        break
      }
    }
    if (!moved) return NaN

    const rho = globalThis.VM.mcmc.autocorrelation(values, maxLag)
    let sum = 0
    for (let k = 1; k < rho.length; k++) {
      if (rho[k] <= 0) break
      sum += rho[k]
    }
    return n / (1 + 2 * sum)
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, effectiveSampleSize}}
})(window)
