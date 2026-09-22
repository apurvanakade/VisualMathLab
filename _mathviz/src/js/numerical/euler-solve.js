/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Advances `y' = f(t, y)`, `y(t0) = y0` with `n` fixed steps of forward
   * Euler's method and returns the full trajectory.
   *
   * @param {(t: number, y: number) => number} f - The right-hand side (see {@link VM.expressions.makeFunction2}).
   * @param {number} t0 - Initial time.
   * @param {number} y0 - Initial value `y(t0)`.
   * @param {number} tEnd - Final time; the step is `h = (tEnd - t0) / n`.
   * @param {number} n - Number of steps. Not validated: `n = 0` gives an
   *   infinite step and a single-point trajectory.
   * @returns {{ts: number[], ys: number[]}} `n + 1` samples each, starting at `(t0, y0)`.
   */
  const eulerSolve = (f, t0, y0, tEnd, n) => {
    const h = (tEnd - t0) / n
    const ts = [t0]
    const ys = [y0]
    let t = t0, y = y0
    for (let i = 0; i < n; i++) {
      y = y + h * f(t, y)
      t = t0 + (i + 1) * h
      ts.push(t)
      ys.push(y)
    }
    return {ts, ys}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, eulerSolve}}
})(window)
