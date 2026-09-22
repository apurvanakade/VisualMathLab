/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Bernoulli mass: `P(K = 1) = p`, `P(K = 0) = 1 - p`.
   *
   * @param {number} k - Outcome; anything other than `0` or `1` has mass `0`.
   * @param {number} p - Success probability (not validated).
   * @returns {number}
   */
  const bernoulliPmf = (k, p) => {
    if (k === 1) return p
    if (k === 0) return 1 - p
    return 0
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, bernoulliPmf}}
})(window)
