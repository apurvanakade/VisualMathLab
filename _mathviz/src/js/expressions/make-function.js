/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Compiles a math.js expression in `x` into a plain JavaScript function.
   *
   * Input is normalized first: trimmed, with `π` replaced by `pi`, so a
   * value typed into a text field can be passed straight through.
   *
   * @param {Object} mathjs - A math.js instance (the global `math` on a page that loads it).
   * @param {string} expr - An expression in `x`, e.g. `"sin(x) + x^2/4"`.
   * @returns {((x: number) => number)|null} The compiled function, or `null`
   *   if the expression can't be parsed. The returned function yields `NaN`
   *   (never throws) when evaluation fails at a point.
   */
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

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeFunction}}
})(window)
