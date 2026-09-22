/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Every barycentric triple `[i, j, k]` with `i, j, k >= 0` and
   * `i + j + k = N` -- the grid points of a uniform order-`N`
   * triangulation of a triangle.
   *
   * @param {number} N - The order (subdivisions per side).
   * @returns {number[][]} `(N+1)(N+2)/2` triples, `i`-major. `[[0,0,0]]`
   *   for `N = 0`; empty for negative `N`.
   */
  const barycentricTriples = (N) => {
    const triples = []
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        triples.push([i, j, N - i - j])
      }
    }
    return triples
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, barycentricTriples}}
})(window)
