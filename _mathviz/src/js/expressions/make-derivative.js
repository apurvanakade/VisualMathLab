/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Like {@link makeFunction}, but compiles the symbolic derivative df/dx of
   * the expression instead of the expression itself.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `x`.
   * @returns {((x: number) => number)|null} The derivative as a function, or
   *   `null` if the expression can't be parsed or differentiated. The
   *   returned function yields `NaN` where evaluation fails.
   */
  const makeDerivative = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const compiled = mathjs.derivative(normalized, "x").compile()
      return x => {
        try { return Number(compiled.evaluate({x})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeDerivative}}
})(window)
