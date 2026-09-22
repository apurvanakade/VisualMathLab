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

  /**
   * One predict+update step of the scalar Kalman filter, for pages that
   * consume measurements one at a time as they arrive -- a live/streaming
   * page has no array for {@link kalman1DFilter} to loop over.
   *
   * @param {{xHat: number, P: number}} prev - The previous state estimate and its error variance.
   * @param {number} z - The new measurement.
   * @param {Object} opts
   * @param {number} opts.R - Assumed measurement-noise variance.
   * @param {number} opts.Q - Assumed process-noise variance (how far the
   *   true state is expected to drift between samples).
   * @returns {{xHat: number, P: number, K: number}} The updated estimate,
   *   its error variance, and the Kalman gain used for this step.
   */
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

  /**
   * Runs {@link kalman1DStep} over a precomputed array of measurements.
   *
   * @param {number[]} zs - The measurements.
   * @param {Object} opts
   * @param {number} opts.R - Assumed measurement-noise variance.
   * @param {number} opts.Q - Assumed process-noise variance.
   * @param {number} [opts.x0=zs[0]] - Initial state estimate.
   * @param {number} [opts.P0=opts.R] - Initial error variance. Defaults to
   *   `R` -- "the first estimate is as uncertain as one measurement" --
   *   not to `1` or `Q`.
   * @returns {{xs: number[], Ps: number[], Ks: number[]}} The estimate,
   *   error variance and gain after each step, each the same length as
   *   `zs` (all empty for an empty input; `opts` is then never read).
   */
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
