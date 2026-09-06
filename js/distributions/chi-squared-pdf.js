/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Chi-squared(k) is exactly Gamma(shape = k/2, rate = 1/2).
  const chiSquaredPdf = (x, k) => {
    return globalThis.VM.distributions.gammaPdf(x, k / 2, 0.5)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, chiSquaredPdf}}
})(window)
