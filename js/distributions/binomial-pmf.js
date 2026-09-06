/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const binomialPmf = (k, n, p) => {
    if (!Number.isInteger(k) || k < 0 || k > n) return 0
    if (p <= 0) return k === 0 ? 1 : 0
    if (p >= 1) return k === n ? 1 : 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logChoose = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
    return Math.exp(logChoose + k * Math.log(p) + (n - k) * Math.log(1 - p))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, binomialPmf}}
})(window)
