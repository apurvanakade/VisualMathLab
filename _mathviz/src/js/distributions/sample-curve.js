/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Samples a function over `[lo, hi]` into parallel arrays ready to hand
   * to a Plotly trace or a `Plot.line`.
   *
   * @param {(x: number) => number} fn - Typically one of the `*Pdf`/`*Pmf` functions, with its parameters bound.
   * @param {number} lo - Start of the range (inclusive).
   * @param {number} hi - End of the range (inclusive).
   * @param {Object} [opts]
   * @param {boolean} [opts.discrete=false] - Evaluate only at the integers
   *   from `ceil(lo)` to `floor(hi)` -- what a PMF actually has support on
   *   -- instead of on a fine grid. `opts.n` is ignored in this mode, and
   *   the arrays are empty if no integer lies in the range.
   * @param {number} [opts.n=400] - Number of evenly spaced samples in
   *   continuous mode, including both endpoints. `n = 1` divides by zero.
   * @returns {{xs: number[], ys: number[]}}
   */
  const sampleCurve = (fn, lo, hi, opts = {}) => {
    const xs = []
    const ys = []

    if (opts.discrete) {
      const start = Math.ceil(lo)
      const end = Math.floor(hi)
      for (let x = start; x <= end; x++) {
        xs.push(x)
        ys.push(fn(x))
      }
      return {xs, ys}
    }

    const n = opts.n ?? 400
    for (let i = 0; i < n; i++) {
      const x = lo + (hi - lo) * i / (n - 1)
      xs.push(x)
      ys.push(fn(x))
    }
    return {xs, ys}
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, sampleCurve}}
})(window)
