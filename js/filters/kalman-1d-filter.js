/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Scalar Kalman filter for a state observed through noisy measurements
  // z_i = x_i + noise:
  //   predict:  xHat- = xHat_{i-1},  P- = P_{i-1} + Q
  //   update:   K = P- / (P- + R),  xHat = xHat- + K*(z_i - xHat-),  P = (1-K)*P-
  // R is the assumed measurement-noise variance and Q the assumed
  // process-noise variance (how much the true state is expected to drift
  // between samples) -- both are beliefs the filter is given, not
  // estimated from the data. Returns {xs, Ps, Ks}: the state estimate,
  // error variance, and gain at each step, each the same length as zs.
  const kalman1DFilter = (zs, opts) => {
    const R = opts.R
    const Q = opts.Q
    const n = zs.length
    const xs = new Array(n)
    const Ps = new Array(n)
    const Ks = new Array(n)
    if (n === 0) return {xs, Ps, Ks}

    let xHat = opts.x0 !== undefined ? opts.x0 : zs[0]
    let P = opts.P0 !== undefined ? opts.P0 : R

    for (let i = 0; i < n; i++) {
      const xPred = xHat
      const pPred = P + Q

      const K = pPred / (pPred + R)
      xHat = xPred + K * (zs[i] - xPred)
      P = (1 - K) * pPred

      xs[i] = xHat
      Ps[i] = P
      Ks[i] = K
    }
    return {xs, Ps, Ks}
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, kalman1DFilter}}
})(window)
