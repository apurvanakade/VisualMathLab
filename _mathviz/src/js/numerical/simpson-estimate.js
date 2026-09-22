/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Approximates the integral of `f` over `[lo, hi]` with the composite
   * Simpson's rule on `n` subintervals.
   *
   * Samples where `f` is not finite (a pole, a domain error) are skipped --
   * they contribute zero rather than turning the whole estimate into `NaN`
   * -- including the two endpoints. So `simpsonEstimate(x => 1/x, 0, 1, n)`
   * returns a finite (wrong) number, not `Infinity`.
   *
   * @param {(x: number) => number} f - The integrand.
   * @param {number} lo - Lower limit.
   * @param {number} hi - Upper limit.
   * @param {number} n - Number of subintervals. **Must be even**; this is not
   *   validated, and an odd `n` silently applies the wrong weights.
   * @returns {number} The estimate.
   */
  const simpsonEstimate = (f, lo, hi, n) => {
    const h = (hi - lo) / n
    let sum = 0
    const y0 = f(lo)
    const yn = f(hi)
    if (Number.isFinite(y0)) sum += y0
    if (Number.isFinite(yn)) sum += yn
    for (let i = 1; i < n; i++) {
      const x = lo + i * h
      const y = f(x)
      if (!Number.isFinite(y)) continue
      if (i % 2 === 1) {
        sum += 4 * y
      } else {
        sum += 2 * y
      }
    }
    return sum * h / 3
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, simpsonEstimate}}
})(window)
