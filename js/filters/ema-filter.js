/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Exponential moving average, a.k.a. a first-order low-pass filter:
  // s_i = alpha*s_{i-1} + (1-alpha)*x_i. `initial`, if given, is the prior
  // belief going into the very first update (matching kalman1DFilter's
  // `x0` option), so s_0 = alpha*initial + (1-alpha)*x_0 -- e.g. seeding a
  // simulation with the true starting state instead of the first noisy
  // sample. Without it, s_0 = x_0 (the pre-existing default: the first
  // output is exactly the first sample, not biased toward 0).
  const emaFilter = (xs, alpha, initial) => {
    const n = xs.length
    const ys = new Array(n)
    if (n === 0) return ys
    ys[0] = initial === undefined ? xs[0] : alpha * initial + (1 - alpha) * xs[0]
    for (let i = 1; i < n; i++) {
      ys[i] = alpha * ys[i - 1] + (1 - alpha) * xs[i]
    }
    return ys
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, emaFilter}}
})(window)
