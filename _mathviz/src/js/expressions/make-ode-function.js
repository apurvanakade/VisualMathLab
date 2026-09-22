/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Compiles an expression in `t` and `y` into a two-argument function --
   * the right-hand side of a first-order ODE `y' = f(t, y)`, in the shape
   * {@link VM.numerical.eulerSolve} and {@link VM.numerical.rk4Solve} take.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `t` and `y`, e.g. `"y - t^2 + 1"`.
   * @returns {((t: number, y: number) => number)|null} The compiled
   *   function, or `null` if the expression can't be parsed. Yields `NaN`
   *   where evaluation fails.
   */
  const makeFunction2 = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const compiled = mathjs.compile(normalized)
      return (t, y) => {
        try { return Number(compiled.evaluate({t, y})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeFunction2}}
})(window)
