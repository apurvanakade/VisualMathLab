/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Like {@link makeFunction}, but binds the free variable as `t` instead of
   * `x` -- for pages where the natural parameter is time (a parametric
   * curve `x(t)`, `y(t)`) rather than a spatial coordinate.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `t`, e.g. `"cos(2t)"`.
   * @returns {((t: number) => number)|null} The compiled function, or `null`
   *   if the expression can't be parsed. Yields `NaN` where evaluation fails.
   */
  const makeFunctionOfT = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const compiled = mathjs.compile(normalized)
      return t => {
        try { return Number(compiled.evaluate({t})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeFunctionOfT}}
})(window)
