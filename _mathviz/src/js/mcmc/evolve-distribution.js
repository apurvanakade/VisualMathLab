/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Pushes a distribution forward through a finite Markov chain:
   * `p_{t+1} = p_t P`, with distributions as row vectors and `P` row-
   * stochastic (`P[i][j]` is the probability of moving from `i` to `j`).
   *
   * @param {number[][]} P - Transition matrix, `k x k`, rows summing to 1
   *   (not validated).
   * @param {number[]} p0 - Initial distribution, length `k`.
   * @param {number} steps - Number of steps to take.
   * @returns {number[][]} `steps + 1` distributions, `[p0, p1, ..., p_steps]`.
   *   `p0` is copied, not aliased.
   */
  const evolveDistribution = (P, p0, steps) => {
    const k = p0.length
    const out = [p0.slice()]
    let current = p0
    for (let t = 1; t <= steps; t++) {
      const next = new Array(k).fill(0)
      for (let i = 0; i < k; i++) {
        const mass = current[i]
        if (mass === 0) continue
        const row = P[i]
        for (let j = 0; j < k; j++) next[j] += mass * row[j]
      }
      out.push(next)
      current = next
    }
    return out
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, evolveDistribution}}
})(window)
