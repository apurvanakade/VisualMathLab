/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // P(K = k) for the "trials until the r-th success" convention, so the
  // support is k = r, r+1, ... and r = 1 reduces exactly to geometricPmf --
  // matching that file's "trials until first success" convention rather than
  // the competing "number of failures" one.
  //
  //   P(K = k) = C(k-1, r-1) p^r (1-p)^(k-r)
  //
  // Computed through logGamma: the binomial coefficient overflows a double
  // long before the probability itself becomes small enough to ignore.
  /**
   * Negative binomial mass in the **trials until the r-th success**
   * convention, so `r = 1` is exactly {@link geometricPmf}.
   *
   * @param {number} k - Trial index of the r-th success; `0` unless an integer `>= r`.
   * @param {number} r - Number of successes to wait for; an integer `>= 1`.
   * @param {number} p - Success probability. `0` outside `(0, 1]`; `p = 1`
   *   puts all mass on `k = r`.
   * @returns {number}
   */
  const negativeBinomialPmf = (k, r, p) => {
    if (!Number.isInteger(k) || !Number.isInteger(r) || r < 1 || k < r) return 0
    if (p <= 0 || p > 1) return 0
    if (p === 1) return k === r ? 1 : 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logCoefficient = logGamma(k) - logGamma(r) - logGamma(k - r + 1)
    return Math.exp(logCoefficient + r * Math.log(p) + (k - r) * Math.log(1 - p))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, negativeBinomialPmf}}
})(window)
