/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Box-Muller transform: turns a uniform generator into a standard-normal
   * one (mean 0, variance 1). Scale and shift the output for any other
   * normal: `mean + sd * gaussian()`.
   *
   * @param {() => number} rng - A uniform `[0, 1)` generator, e.g. the return
   *   value of {@link seededRandom}. Two draws are consumed per sample, so
   *   a seeded sequence stays reproducible.
   * @returns {() => number} A standard-normal generator.
   */
  const gaussianRandom = (rng) => {
    return () => {
      const u1 = Math.max(rng(), 1e-12)
      const u2 = rng()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }
  }

  globalThis.VM = {...globalThis.VM, sampling: {...globalThis.VM?.sampling, gaussianRandom}}
})(window)
