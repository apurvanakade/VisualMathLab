/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Beta density on the open interval `(0, 1)`.
   *
   * @param {number} x - `0` at and outside the endpoints, so `betaPdf(0, 1, 1)`
   *   is `0` even though the density is `1` on the interior.
   * @param {number} a - First shape parameter; must be `> 0`.
   * @param {number} b - Second shape parameter; must be `> 0`.
   * @returns {number}
   */
  const betaPdf = (x, a, b) => {
    if (x <= 0 || x >= 1 || a <= 0 || b <= 0) return 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logB = logGamma(a) + logGamma(b) - logGamma(a + b)
    const logPdf = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB
    return Math.exp(logPdf)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, betaPdf}}
})(window)
