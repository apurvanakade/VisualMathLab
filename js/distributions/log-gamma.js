/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Lanczos approximation (g=7, n=9) to ln(Gamma(x)) for x > 0. Used instead
  // of Math.log(math.gamma(x)) because Gamma(x) itself overflows
  // Number.MAX_VALUE past x ~ 171 -- binomial coefficients and the
  // gamma/beta/t/F densities on this page need x well past that.
  const lanczosCoefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ]

  const logGamma = (x) => {
    if (x < 0.5) {
      // Reflection formula: Gamma(x) * Gamma(1-x) = pi / sin(pi*x).
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
    }
    const y = x - 1
    const t = y + 7.5
    let a = lanczosCoefficients[0]
    for (let i = 1; i < 9; i++) a += lanczosCoefficients[i] / (y + i)
    return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, logGamma}}
})(window)
