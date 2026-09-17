/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const fPdf = (x, d1, d2) => {
    if (x <= 0 || d1 <= 0 || d2 <= 0) return 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logB = logGamma(d1 / 2) + logGamma(d2 / 2) - logGamma((d1 + d2) / 2)
    const logPdf = 0.5 * (d1 * Math.log(d1) + d1 * Math.log(x) + d2 * Math.log(d2)
      - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - logB
    return Math.exp(logPdf)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, fPdf}}
})(window)
