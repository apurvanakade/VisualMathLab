/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const poissonPmf = (k, lambda) => {
    if (!Number.isInteger(k) || k < 0) return 0
    if (lambda <= 0) return k === 0 ? 1 : 0
    const logGamma = globalThis.VM.distributions.logGamma
    return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, poissonPmf}}
})(window)
