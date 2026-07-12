/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Like makeFunction but returns the symbolic derivative df/dx.
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

  globalThis.VM = {...globalThis.VM, makeDerivative}
})(window)
