/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Exponential moving average, a.k.a. a first-order low-pass filter:
  // s_i = alpha*s_{i-1} + (1-alpha)*x_i, seeded with s_0 = x_0 so the first
  // output is exactly the first sample rather than biased toward 0.
  const emaFilter = (xs, alpha) => {
    const n = xs.length
    const ys = new Array(n)
    if (n === 0) return ys
    ys[0] = xs[0]
    for (let i = 1; i < n; i++) {
      ys[i] = alpha * ys[i - 1] + (1 - alpha) * xs[i]
    }
    return ys
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, emaFilter}}
})(window)
