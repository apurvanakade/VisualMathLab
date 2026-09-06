/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // P(K = k) for the "trials until first success" convention, k = 1, 2, 3, ...
  const geometricPmf = (k, p) => {
    if (!Number.isInteger(k) || k < 1) return 0
    return Math.pow(1 - p, k - 1) * p
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, geometricPmf}}
})(window)
