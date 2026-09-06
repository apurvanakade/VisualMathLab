/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const betaPdf = (x, a, b) => {
    if (x <= 0 || x >= 1 || a <= 0 || b <= 0) return 0
    const logGamma = globalThis.VM.distributions.logGamma
    const logB = logGamma(a) + logGamma(b) - logGamma(a + b)
    const logPdf = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB
    return Math.exp(logPdf)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, betaPdf}}
})(window)
