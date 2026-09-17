/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Left-tail probability P(F <= x) of the F distribution with (d1, d2)
  // degrees of freedom (the density is fPdf): the regularized incomplete
  // beta I_y(d1/2, d2/2) with y = d1 * x / (d1 * x + d2).
  const fCdf = (x, d1, d2) => {
    if (!(d1 > 0) || !(d2 > 0) || Number.isNaN(x)) return NaN
    if (x <= 0) return 0
    const y = (d1 * x) / (d1 * x + d2)
    return globalThis.VM.distributions.regularizedBetaI(y, d1 / 2, d2 / 2)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, fCdf}}
})(window)
