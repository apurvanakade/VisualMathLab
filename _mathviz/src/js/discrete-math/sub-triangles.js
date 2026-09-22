/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * The small triangles of a uniform order-`N` triangulation, each as a
   * triple of barycentric triples: the `N(N+1)/2` "upward" triangles
   * first, then the `N(N-1)/2` "downward" ones.
   *
   * @param {number} N - The order.
   * @returns {number[][][]} `N²` triangles, each `[[i,j,k], [i,j,k], [i,j,k]]`.
   */
  const subTriangleTriples = (N) => {
    const triangles = []
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N - i; j++) {
        triangles.push([
          [i, j, N - i - j],
          [i + 1, j, N - i - j - 1],
          [i, j + 1, N - i - j - 1]
        ])
      }
    }
    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - i - 1; j++) {
        triangles.push([
          [i + 1, j, N - i - j - 1],
          [i + 1, j + 1, N - i - j - 2],
          [i, j + 1, N - i - j - 1]
        ])
      }
    }
    return triangles
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, subTriangleTriples}}
})(window)
