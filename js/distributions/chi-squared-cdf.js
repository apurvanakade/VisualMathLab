/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Left-tail probability P(X <= x) of chi-squared(k) (the density is
  // chiSquaredPdf): the regularized lower incomplete gamma P(k/2, x/2). The
  // goodness-of-fit p-value is the right tail, 1 - chiSquaredCdf(x, k).
  const chiSquaredCdf = (x, k) => {
    if (!(k > 0) || Number.isNaN(x)) return NaN
    if (x <= 0) return 0
    return globalThis.VM.distributions.regularizedGammaP(k / 2, x / 2)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, chiSquaredCdf}}
})(window)
