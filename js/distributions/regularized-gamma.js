/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // The regularized lower incomplete gamma function P(s, x) = gamma(s, x) / Gamma(s).
  // This is the CDF of a Gamma(s, 1) variable, and the chi-squared CDF is
  // P(k/2, x/2) -- so it's what turns an observed chi-squared statistic into
  // a p-value.
  //
  // Two evaluations, split where each converges fastest (Numerical Recipes,
  // sec. 6.2): a power series for x < s + 1, and the continued fraction for
  // the complementary Q(s, x) = 1 - P(s, x) otherwise.
  const MAX_ITERATIONS = 300
  const EPSILON = 1e-15
  const TINY = 1e-300

  const regularizedGammaP = (s, x) => {
    if (!(s > 0) || x < 0) return NaN
    if (x === 0) return 0

    const logPrefactor = -x + s * Math.log(x) - globalThis.VM.distributions.logGamma(s)

    if (x < s + 1) {
      let term = 1 / s
      let sum = term
      let denom = s
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        denom += 1
        term *= x / denom
        sum += term
        if (Math.abs(term) < Math.abs(sum) * EPSILON) break
      }
      return sum * Math.exp(logPrefactor)
    }

    // Lentz's continued fraction for Q(s, x).
    let b = x + 1 - s
    let c = 1 / TINY
    let d = 1 / b
    let h = d
    for (let i = 1; i < MAX_ITERATIONS; i++) {
      const an = -i * (i - s)
      b += 2
      d = an * d + b
      if (Math.abs(d) < TINY) d = TINY
      c = b + an / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      const delta = d * c
      h *= delta
      if (Math.abs(delta - 1) < EPSILON) break
    }
    const q = Math.exp(logPrefactor) * h
    return 1 - q
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, regularizedGammaP}}
})(window)
