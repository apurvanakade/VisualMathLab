/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Samples a density function over [lo, hi] into {xs, ys} ready to hand to
  // a Plotly trace. Continuous by default: `opts.n` (default 400) evenly
  // spaced points. With `opts.discrete: true` it instead evaluates the
  // function at each integer from ceil(lo) to floor(hi) -- for a PMF, where
  // only whole-number x carry mass.
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
