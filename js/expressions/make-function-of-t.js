/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Like VM.expressions.makeFunction, but binds the free variable as `t`
  // instead of `x` -- for pages where the natural parameter name is time
  // (e.g. a parametric curve x(t), y(t)) rather than a spatial coordinate.
  // Returns a JS function (t => number) or null if the expression can't be
  // parsed. The returned function returns NaN on evaluation errors.
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
