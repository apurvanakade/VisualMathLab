/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Shape k, SCALE lambda (not a rate) -- so shape 1 is Exponential with rate
  // 1/scale, which is the special case the relationship map draws. Shape
  // below 1 gives a failure rate that falls with age, above 1 one that rises.
  const weibullPdf = (x, shape, scale) => {
    if (x < 0 || shape <= 0 || scale <= 0) return 0
    if (x === 0) return shape === 1 ? 1 / scale : 0
    const z = x / scale
    return (shape / scale) * Math.pow(z, shape - 1) * Math.exp(-Math.pow(z, shape))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, weibullPdf}}
})(window)
