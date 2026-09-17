/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // The regularized incomplete beta function I_x(a, b). Both the Student t
  // CDF and the F CDF reduce to it, so it's what turns an observed t or F
  // statistic into a p-value.
  //
  // Evaluated with the Lentz continued fraction (Numerical Recipes, sec.
  // 6.4). The fraction converges quickly only for x < (a + 1) / (a + b + 2);
  // past that, the symmetry I_x(a, b) = 1 - I_{1-x}(b, a) moves x back into
  // the fast region.
  const MAX_ITERATIONS = 300
  const EPSILON = 1e-15
  const TINY = 1e-300

  const betaContinuedFraction = (x, a, b) => {
    const qab = a + b
    const qap = a + 1
    const qam = a - 1
    let c = 1
    let d = 1 - (qab * x) / qap
    if (Math.abs(d) < TINY) d = TINY
    d = 1 / d
    let h = d

    for (let m = 1; m < MAX_ITERATIONS; m++) {
      const m2 = 2 * m
      let numerator = (m * (b - m) * x) / ((qam + m2) * (a + m2))
      d = 1 + numerator * d
      if (Math.abs(d) < TINY) d = TINY
      c = 1 + numerator / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      h *= d * c

      numerator = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
      d = 1 + numerator * d
      if (Math.abs(d) < TINY) d = TINY
      c = 1 + numerator / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      const delta = d * c
      h *= delta
      if (Math.abs(delta - 1) < EPSILON) break
    }
    return h
  }

  const regularizedBetaI = (x, a, b) => {
    if (!(a > 0) || !(b > 0) || Number.isNaN(x)) return NaN
    if (x <= 0) return 0
    if (x >= 1) return 1

    const logGamma = globalThis.VM.distributions.logGamma
    const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b)
    const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta)

    if (x < (a + 1) / (a + b + 2)) {
      return (front * betaContinuedFraction(x, a, b)) / a
    }
    return 1 - (front * betaContinuedFraction(1 - x, b, a)) / b
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, regularizedBetaI}}
})(window)
