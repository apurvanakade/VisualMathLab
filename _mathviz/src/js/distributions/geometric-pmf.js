/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Geometric mass in the **trials until the first success** convention:
   * `P(K = k) = (1-p)^{k-1} p` for `k = 1, 2, 3, ...` (not the competing
   * "number of failures before the first success" convention, whose
   * support starts at 0).
   *
   * @param {number} k - Trial index of the first success; `0` unless an integer `>= 1`.
   * @param {number} p - Success probability (not validated).
   * @returns {number}
   */
  const geometricPmf = (k, p) => {
    if (!Number.isInteger(k) || k < 1) return 0
    return Math.pow(1 - p, k - 1) * p
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, geometricPmf}}
})(window)
