/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Chi-squared density with `k` degrees of freedom -- exactly
   * `gammaPdf(x, k/2, 1/2)`.
   *
   * @param {number} x - `0` for `x <= 0`.
   * @param {number} k - Degrees of freedom; must be `> 0`.
   * @returns {number}
   */
  const chiSquaredPdf = (x, k) => {
    return globalThis.VM.distributions.gammaPdf(x, k / 2, 0.5)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, chiSquaredPdf}}
})(window)
