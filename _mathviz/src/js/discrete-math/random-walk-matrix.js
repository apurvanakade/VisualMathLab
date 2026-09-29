/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * The simple random walk on an undirected graph: from a vertex, move to
   * a uniformly chosen neighbor, so `P[i][j] = 1 / deg(i)` for each edge.
   * Its stationary distribution is proportional to degree,
   * `pi_i = deg(i) / (2 * |E|)`, which is returned alongside.
   *
   * The lazy walk stays put with probability 1/2 and otherwise takes a
   * simple-walk step, `(I + P) / 2`. It has the same stationary
   * distribution but no eigenvalue at `-1`, so it converges on a bipartite
   * graph (a path, a tree, a grid, an even cycle), where the simple walk
   * oscillates forever.
   *
   * @param {number} nodeCount - Vertices are `0..nodeCount-1`.
   * @param {Array<[number, number]>} edges - Undirected edges; each listed
   *   once. Self-loops and repeated edges are not checked for.
   * @param {Object} [opts]
   * @param {boolean} [opts.lazy=false] - Return the lazy walk.
   * @returns {{P: number[][], degrees: number[], stationary: number[]}}
   *   `P` is row-stochastic. An isolated vertex (degree 0) gets a row that
   *   stays put, `P[i][i] = 1`, and stationary mass 0; with no edges at all
   *   `stationary` is uniform.
   */
  const randomWalkMatrix = (nodeCount, edges, opts = {}) => {
    const lazy = opts.lazy ?? false
    const degrees = new Array(nodeCount).fill(0)
    for (const [u, v] of edges) {
      degrees[u]++
      degrees[v]++
    }

    const P = []
    for (let i = 0; i < nodeCount; i++) P.push(new Array(nodeCount).fill(0))
    for (const [u, v] of edges) {
      P[u][v] += 1 / degrees[u]
      P[v][u] += 1 / degrees[v]
    }
    for (let i = 0; i < nodeCount; i++) {
      if (degrees[i] === 0) P[i][i] = 1
    }
    if (lazy) {
      for (let i = 0; i < nodeCount; i++) {
        for (let j = 0; j < nodeCount; j++) P[i][j] /= 2
        P[i][i] += 0.5
      }
    }

    let totalDegree = 0
    for (const d of degrees) totalDegree += d
    const stationary = []
    for (let i = 0; i < nodeCount; i++) {
      if (totalDegree === 0) {
        stationary.push(1 / nodeCount)
      } else {
        stationary.push(degrees[i] / totalDegree)
      }
    }

    return {P, degrees, stationary}
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, randomWalkMatrix}}
})(window)
