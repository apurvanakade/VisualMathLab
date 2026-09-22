/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Binomial mass: the probability of exactly `k` successes in `n`
   * independent trials with success probability `p`. Computed through
   * {@link logGamma}, so `n` in the hundreds or thousands is fine.
   *
   * @param {number} k - Number of successes; `0` unless an integer in `[0, n]`.
   * @param {number} n - Number of trials.
   * @param {number} p - Success probability. `p <= 0` puts all mass on `k = 0`,
   *   `p >= 1` all mass on `k = n`.
   * @returns {number}
   */
  const binomialPmf = (k, n, p) => {
    if (!Number.isInteger(k) || k < 0 || k > n) return 0
    if (p <= 0) return k === 0 ? 1 : 0
    if (p >= 1) return k === n ? 1 : 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logChoose = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
    return Math.exp(logChoose + k * Math.log(p) + (n - k) * Math.log(1 - p))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, binomialPmf}}
})(window)
