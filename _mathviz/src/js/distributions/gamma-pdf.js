/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Gamma density parameterized by shape and **rate** (not scale): the
   * mean is `shape / rate`. Valid for any real `shape > 0`, via
   * {@link logGamma}.
   *
   * @param {number} x - `0` for `x <= 0`.
   * @param {number} shape - Must be `> 0`.
   * @param {number} rate - Must be `> 0`. For a scale `θ`, pass `1 / θ`.
   * @returns {number}
   */
  const gammaPdf = (x, shape, rate) => {
    if (x <= 0 || shape <= 0 || rate <= 0) return 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logPdf = shape * Math.log(rate) + (shape - 1) * Math.log(x) - rate * x - logGamma(shape)
    return Math.exp(logPdf)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, gammaPdf}}
})(window)
