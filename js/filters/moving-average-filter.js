/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Causal simple moving average: output[i] is the average of the last k
  // samples ending at i. Near the start, where fewer than k samples have
  // arrived yet, it averages whatever is available -- this streaming
  // definition never looks ahead, matching how the filter would run online
  // one sample at a time.
  const movingAverageFilter = (xs, k) => {
    const n = xs.length
    const windowSize = Math.max(1, Math.round(k))
    const ys = new Array(n)
    let sum = 0
    for (let i = 0; i < n; i++) {
      sum += xs[i]
      if (i >= windowSize) sum -= xs[i - windowSize]
      const count = Math.min(i + 1, windowSize)
      ys[i] = sum / count
    }
    return ys
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, movingAverageFilter}}
})(window)
