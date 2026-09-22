/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Evaluates a constant math.js expression to a JavaScript number. This is
   * what lets every numeric field on a page (an initial guess, an interval
   * endpoint, a step count) accept `pi/4` or `2^10` rather than only a
   * literal.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - A constant expression, e.g. `"1 + 2*3 + pi - e"`.
   * @returns {number|null} The value, or `null` if the expression can't be
   *   parsed, references a free variable, or doesn't evaluate to a finite
   *   number.
   */
  const makeNumber = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const value = Number(mathjs.evaluate(normalized))
      if (!Number.isFinite(value)) return null
      return value
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeNumber}}
})(window)
