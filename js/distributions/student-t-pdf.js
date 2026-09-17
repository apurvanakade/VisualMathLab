/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const studentTPdf = (x, k) => {
    if (k <= 0) return 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logPdf = logGamma((k + 1) / 2) - logGamma(k / 2) - 0.5 * Math.log(k * Math.PI)
      - ((k + 1) / 2) * Math.log(1 + (x * x) / k)
    return Math.exp(logPdf)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, studentTPdf}}
})(window)
