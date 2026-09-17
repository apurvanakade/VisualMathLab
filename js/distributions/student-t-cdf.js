/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Left-tail probability P(T <= x) of Student's t with k degrees of freedom
  // (the density is studentTPdf). Written through the regularized incomplete
  // beta function: with y = k / (k + x^2), P(T <= x) is 1 - I_y(k/2, 1/2) / 2
  // for x > 0 and I_y(k/2, 1/2) / 2 for x <= 0 -- the split keeps y in
  // [0, 1] and uses the distribution's symmetry about 0.
  const studentTCdf = (x, k) => {
    if (!(k > 0) || Number.isNaN(x)) return NaN
    const y = k / (k + x * x)
    const half = globalThis.VM.distributions.regularizedBetaI(y, k / 2, 0.5) / 2
    if (x > 0) return 1 - half
    return half
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, studentTCdf}}
})(window)
