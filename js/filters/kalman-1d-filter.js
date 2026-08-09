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
  // estimated from the data.

  // One predict+update step: takes the previous {xHat, P} belief and a new
  // measurement z, returns the new {xHat, P, K}. Separated from
  // kalman1DFilter (which just loops this over a precomputed array) for
  // pages that consume measurements one at a time as they actually arrive
  // -- a live/streaming page has no array to loop over.
  const kalman1DStep = (prev, z, opts) => {
    const R = opts.R
    const Q = opts.Q
    const xPred = prev.xHat
    const pPred = prev.P + Q

    const K = pPred / (pPred + R)
    const xHat = xPred + K * (z - xPred)
    const P = (1 - K) * pPred

    return {xHat, P, K}
  }

  // Runs kalman1DStep over a precomputed array zs, returning {xs, Ps, Ks}:
  // the state estimate, error variance, and gain at each step, each the
  // same length as zs.
  const kalman1DFilter = (zs, opts) => {
    const n = zs.length
    const xs = new Array(n)
    const Ps = new Array(n)
    const Ks = new Array(n)
    if (n === 0) return {xs, Ps, Ks}

    let state = {
      xHat: opts.x0 !== undefined ? opts.x0 : zs[0],
      P: opts.P0 !== undefined ? opts.P0 : opts.R
    }

    for (let i = 0; i < n; i++) {
      state = kalman1DStep(state, zs[i], opts)
      xs[i] = state.xHat
      Ps[i] = state.P
      Ks[i] = state.K
    }
    return {xs, Ps, Ks}
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, kalman1DStep, kalman1DFilter}}
})(window)
