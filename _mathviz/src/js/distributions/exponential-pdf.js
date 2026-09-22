/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Exponential density with the given **rate** (mean `1 / rate`).
   *
   * @param {number} x - `0` for `x < 0`.
   * @param {number} rate - Must be `> 0`; otherwise `0`.
   * @returns {number}
   */
  const exponentialPdf = (x, rate) => {
    if (x < 0 || rate <= 0) return 0
    return rate * Math.exp(-rate * x)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, exponentialPdf}}
})(window)
