/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Force-directed (Fruchterman-Reingold) layout of an undirected graph:
   * every pair of vertices repels with force `k^2 / d`, every edge pulls
   * its ends together with force `d^2 / k`, and each vertex moves along its
   * net force by at most a "temperature" that cools linearly to zero. Dense
   * clusters end up as tight blobs and a bottleneck edge as a long bridge
   * between them, which is what makes the picture worth drawing.
   *
   * Deterministic: the starting positions come from
   * `VM.sampling.seededRandom(seed)`, so the same graph and seed always give
   * the same picture.
   *
   * @param {number} nodeCount - Vertices are `0..nodeCount-1`.
   * @param {Array<[number, number]>} edges - Undirected edges.
   * @param {Object} [opts]
   * @param {number} [opts.seed=42] - Seed for the starting positions.
   * @param {number} [opts.iterations=300]
   * @returns {Array<[number, number]>} One `[x, y]` per vertex, centered
   *   on the origin and scaled so the larger coordinate extent is
   *   `[-1, 1]`. A single vertex sits at `[0, 0]`; `[]` for no vertices.
   */
  const springLayout = (nodeCount, edges, opts = {}) => {
    const seed = opts.seed ?? 42
    const iterations = opts.iterations ?? 300
    if (nodeCount === 0) return []
    if (nodeCount === 1) return [[0, 0]]

    const rng = globalThis.VM.sampling.seededRandom(seed)
    const xs = []
    const ys = []
    for (let i = 0; i < nodeCount; i++) {
      xs.push(rng())
      ys.push(rng())
    }

    const k = Math.sqrt(1 / nodeCount)
    const startTemperature = 0.1
    for (let iter = 0; iter < iterations; iter++) {
      const temperature = startTemperature * (1 - iter / iterations)
      const dx = new Array(nodeCount).fill(0)
      const dy = new Array(nodeCount).fill(0)

      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const ex = xs[i] - xs[j]
          const ey = ys[i] - ys[j]
          const dist = Math.max(Math.hypot(ex, ey), 1e-3)
          const force = (k * k) / dist
          dx[i] += (ex / dist) * force
          dy[i] += (ey / dist) * force
          dx[j] -= (ex / dist) * force
          dy[j] -= (ey / dist) * force
        }
      }

      for (const [u, v] of edges) {
        const ex = xs[u] - xs[v]
        const ey = ys[u] - ys[v]
        const dist = Math.max(Math.hypot(ex, ey), 1e-3)
        const force = (dist * dist) / k
        dx[u] -= (ex / dist) * force
        dy[u] -= (ey / dist) * force
        dx[v] += (ex / dist) * force
        dy[v] += (ey / dist) * force
      }

      for (let i = 0; i < nodeCount; i++) {
        const length = Math.hypot(dx[i], dy[i])
        if (length === 0) continue
        const step = Math.min(length, temperature)
        xs[i] += (dx[i] / length) * step
        ys[i] += (dy[i] / length) * step
      }
    }

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
    for (let i = 0; i < nodeCount; i++) {
      xMin = Math.min(xMin, xs[i])
      xMax = Math.max(xMax, xs[i])
      yMin = Math.min(yMin, ys[i])
      yMax = Math.max(yMax, ys[i])
    }
    const cx = (xMin + xMax) / 2
    const cy = (yMin + yMax) / 2
    let half = Math.max(xMax - xMin, yMax - yMin) / 2
    if (half === 0) half = 1

    const out = []
    for (let i = 0; i < nodeCount; i++) out.push([(xs[i] - cx) / half, (ys[i] - cy) / half])
    return out
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, springLayout}}
})(window)
