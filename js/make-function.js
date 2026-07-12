/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Returns a JS function (x => number) or null if the expression can't be parsed.
  // The returned function returns NaN on evaluation errors.
  const makeFunction = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const compiled = mathjs.compile(normalized)
      return x => {
        try { return Number(compiled.evaluate({x})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, makeFunction}
})(window)
