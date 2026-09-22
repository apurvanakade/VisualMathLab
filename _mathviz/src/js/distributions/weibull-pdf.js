/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Shape k, SCALE lambda (not a rate) -- so shape 1 is Exponential with rate
  // 1/scale, which is the special case the relationship map draws. Shape
  // below 1 gives a failure rate that falls with age, above 1 one that rises.
  /**
   * Weibull density parameterized by shape and **scale** (not rate), so
   * `shape = 1` is the exponential with rate `1 / scale`.
   *
   * @param {number} x - `0` for `x < 0`. At `x = 0` the density is `1/scale`
   *   when `shape === 1` and `0` otherwise (the `shape < 1` pole is not drawn).
   * @param {number} shape - Must be `> 0`.
   * @param {number} scale - Must be `> 0`.
   * @returns {number}
   */
  const weibullPdf = (x, shape, scale) => {
    if (x < 0 || shape <= 0 || scale <= 0) return 0
    if (x === 0) return shape === 1 ? 1 / scale : 0
    const z = x / scale
    return (shape / scale) * Math.pow(z, shape - 1) * Math.exp(-Math.pow(z, shape))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, weibullPdf}}
})(window)
