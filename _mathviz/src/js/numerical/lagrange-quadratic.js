/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Samples the unique quadratic through three points -- built from the
   * Lagrange basis -- at `sampleCount + 1` evenly spaced abscissae from
   * `x0` to `x2` inclusive. This is the parabola one Simpson panel
   * integrates, drawn so it can be shown.
   *
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {number} sampleCount - Number of intervals between samples.
   * @returns {{xs: number[], ys: number[]}} `sampleCount + 1` points. The
   *   three x-values must be distinct; a repeat divides by zero and fills
   *   `ys` with `Infinity`/`NaN`.
   */
  const lagrangeQuadratic = (x0, y0, x1, y1, x2, y2, sampleCount) => {
    const xs = []
    const ys = []
    for (let k = 0; k <= sampleCount; k++) {
      const x = x0 + (x2 - x0) * k / sampleCount
      const l0 = ((x - x1) * (x - x2)) / ((x0 - x1) * (x0 - x2))
      const l1 = ((x - x0) * (x - x2)) / ((x1 - x0) * (x1 - x2))
      const l2 = ((x - x0) * (x - x1)) / ((x2 - x0) * (x2 - x1))
      xs.push(x)
      ys.push(y0 * l0 + y1 * l1 + y2 * l2)
    }
    return {xs, ys}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, lagrangeQuadratic}}
})(window)
