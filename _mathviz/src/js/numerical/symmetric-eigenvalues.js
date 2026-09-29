/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Eigenvalues of a real symmetric matrix by the cyclic Jacobi method:
   * sweep over every off-diagonal entry, zeroing each with a plane
   * rotation, until the off-diagonal part is negligible. Slow (`O(k^3)` per
   * sweep) but short, dependency-free and accurate for the few-dozen-row
   * matrices a page draws, e.g. the symmetrized transition matrix
   * `D^{1/2} P D^{-1/2}` of a random walk, whose eigenvalues are `P`'s.
   *
   * @param {number[][]} A - Symmetric `k x k` matrix. Only symmetry of the
   *   input is assumed, not checked; `A` itself is not modified.
   * @param {Object} [opts]
   * @param {number} [opts.tolerance=1e-12] - Stop once the off-diagonal
   *   sum of squares falls below this.
   * @param {number} [opts.maxSweeps=100]
   * @returns {number[]} The `k` eigenvalues, sorted descending (with
   *   multiplicity). `[]` for an empty matrix.
   */
  const symmetricEigenvalues = (A, opts = {}) => {
    const tolerance = opts.tolerance ?? 1e-12
    const maxSweeps = opts.maxSweeps ?? 100
    const k = A.length
    const a = []
    for (const row of A) a.push(row.slice())

    for (let sweep = 0; sweep < maxSweeps; sweep++) {
      let off = 0
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) off += a[i][j] * a[i][j]
      }
      if (off < tolerance) break

      for (let p = 0; p < k; p++) {
        for (let q = p + 1; q < k; q++) {
          if (Math.abs(a[p][q]) < 1e-300) continue
          // The rotation angle that zeroes a[p][q]; t = tan(theta), taken
          // as the smaller root for stability.
          const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
          let t = 1 / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
          if (theta < 0) t = -t
          const c = 1 / Math.sqrt(t * t + 1)
          const s = t * c

          for (let r = 0; r < k; r++) {
            const arp = a[r][p]
            const arq = a[r][q]
            a[r][p] = c * arp - s * arq
            a[r][q] = s * arp + c * arq
          }
          for (let r = 0; r < k; r++) {
            const apr = a[p][r]
            const aqr = a[q][r]
            a[p][r] = c * apr - s * aqr
            a[q][r] = s * apr + c * aqr
          }
        }
      }
    }

    const values = []
    for (let i = 0; i < k; i++) values.push(a[i][i])
    values.sort((x, y) => y - x)
    return values
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, symmetricEigenvalues}}
})(window)
