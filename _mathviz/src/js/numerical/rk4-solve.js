/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Advances `y' = f(t, y)`, `y(t0) = y0` with `n` fixed steps of the
   * classical fourth-order Runge-Kutta method and returns the full
   * trajectory. Same signature and return shape as {@link eulerSolve}, so
   * a page can switch methods by swapping the function.
   *
   * @param {(t: number, y: number) => number} f - The right-hand side.
   * @param {number} t0 - Initial time.
   * @param {number} y0 - Initial value `y(t0)`.
   * @param {number} tEnd - Final time; the step is `h = (tEnd - t0) / n`.
   * @param {number} n - Number of steps (not validated).
   * @returns {{ts: number[], ys: number[]}} `n + 1` samples each, starting at `(t0, y0)`.
   */
  const rk4Solve = (f, t0, y0, tEnd, n) => {
    const h = (tEnd - t0) / n
    const ts = [t0]
    const ys = [y0]
    let t = t0, y = y0
    for (let i = 0; i < n; i++) {
      const k1 = f(t, y)
      const k2 = f(t + h / 2, y + (h / 2) * k1)
      const k3 = f(t + h / 2, y + (h / 2) * k2)
      const k4 = f(t + h, y + h * k3)
      y = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
      t = t0 + (i + 1) * h
      ts.push(t)
      ys.push(y)
    }
    return {ts, ys}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, rk4Solve}}
})(window)
