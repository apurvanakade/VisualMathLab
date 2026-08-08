/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Deterministic mulberry32 PRNG factory: the same seed always produces
  // the same sequence, which is what lets a page's noisy demo data stay
  // reproducible from a URL-shared seed. Returns () => number in [0, 1).
  const seededRandom = (seed) => {
    let state = seed >>> 0
    return () => {
      state = (state + 0x6D2B79F5) | 0
      let t = Math.imul(state ^ (state >>> 15), 1 | state)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  globalThis.VM = {...globalThis.VM, sampling: {...globalThis.VM?.sampling, seededRandom}}
})(window)
