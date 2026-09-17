/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Location `location`, half-width-at-half-maximum `scale`. The Cauchy has
  // no mean and no variance -- both integrals diverge -- so `location` is its
  // median rather than its mean, and `scale` is a spread parameter rather
  // than a standard deviation.
  const cauchyPdf = (x, location, scale) => {
    if (scale <= 0) return 0
    const z = (x - location) / scale
    return 1 / (Math.PI * scale * (1 + z * z))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, cauchyPdf}}
})(window)
