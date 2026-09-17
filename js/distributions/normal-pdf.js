/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  const normalPdf = (x, mean, variance) => {
    if (variance <= 0) return 0
    const diff = x - mean
    return Math.exp(-(diff * diff) / (2 * variance)) / Math.sqrt(2 * Math.PI * variance)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, normalPdf}}
})(window)
