/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  const gcd = (a, b) => {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b !== 0) {
      const remainder = a % b
      a = b
      b = remainder
    }
    if (a === 0) return 1
    return a
  }

  const reduce = (num, den) => {
    if (den < 0) {
      num = -num
      den = -den
    }
    const divisor = gcd(num, den)
    return {num: num / divisor, den: den / divisor}
  }

  const parseDecimal = body => {
    let negative = false
    let digits = body
    if (digits.startsWith("-")) {
      negative = true
      digits = digits.slice(1)
    }
    const dotIndex = digits.indexOf(".")
    let intPart = digits
    let fracPart = ""
    if (dotIndex !== -1) {
      intPart = digits.slice(0, dotIndex)
      fracPart = digits.slice(dotIndex + 1)
    }
    if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null
    if (intPart === "" && fracPart === "") return null

    let intValue = 0
    if (intPart !== "") intValue = Number(intPart)
    let fracValue = 0
    if (fracPart !== "") fracValue = Number(fracPart)

    const den = Math.pow(10, fracPart.length)
    let num = intValue * den + fracValue
    if (negative) num = -num
    return reduce(num, den)
  }

  /**
   * Parses a rational-number *literal* into an exact reduced fraction, for
   * displaying values such as Butcher-tableau coefficients without floating
   * point noise.
   *
   * Unlike its siblings in `VM.expressions`, this takes no math.js instance
   * and does not evaluate expressions: only a plain integer (`"3"`, `"-3"`),
   * a fraction of integers (`"1/2"`, `"-1 / 3"`) or a decimal (`"0.25"`,
   * `".5"`) is accepted. `"1/2 + 1"`, `"pi"`, `"1e3"` and `"1."` all
   * return `null`.
   *
   * @param {string} expr - The literal to parse; surrounding whitespace is ignored.
   * @returns {{num: number, den: number}|null} Numerator and denominator in
   *   lowest terms with `den > 0`, or `null` for an empty string, a zero
   *   denominator, or anything that isn't one of the three literal forms.
   */
  const makeRational = expr => {
    const text = String(expr).trim()
    if (text === "") return null

    const fractionMatch = text.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
    if (fractionMatch !== null) {
      const num = Number(fractionMatch[1])
      const den = Number(fractionMatch[2])
      if (den === 0) return null
      return reduce(num, den)
    }

    if (/^-?\d+$/.test(text)) return reduce(Number(text), 1)

    if (/^-?\d*\.\d+$/.test(text)) return parseDecimal(text)

    return null
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeRational}}
})(window)
