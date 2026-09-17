/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The density of e^X for X ~ Normal(mean, variance) -- note the parameters
  // describe the underlying normal, not the lognormal's own mean and
  // variance, which are exp(mu + s2/2) and (e^s2 - 1) e^(2mu + s2).
  const lognormalPdf = (x, mean, variance) => {
    if (x <= 0 || variance <= 0) return 0
    const z = Math.log(x) - mean
    return Math.exp(-(z * z) / (2 * variance)) / (x * Math.sqrt(2 * Math.PI * variance))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, lognormalPdf}}
})(window)
