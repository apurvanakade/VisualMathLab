/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Total variation distance between two distributions on the same finite
   * set, `(1/2) * sum_i |p_i - q_i|` -- the largest difference in
   * probability the two assign to any one event, and the distance mixing
   * times are measured in.
   *
   * @param {number[]} p
   * @param {number[]} q - Same length as `p` (not validated).
   * @returns {number} In `[0, 1]` for probability vectors.
   */
  const totalVariation = (p, q) => {
    let sum = 0
    for (let i = 0; i < p.length; i++) sum += Math.abs(p[i] - q[i])
    return sum / 2
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, totalVariation}}
})(window)
