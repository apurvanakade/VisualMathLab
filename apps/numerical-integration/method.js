/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Numerical Integration page's examples, method and convergence fit,
// imported by its OJS cells and by method.test.js, which checks every
// example's fitted orders. Uses VM.numerical.simpsonEstimate and
// VM.numerical.linearRegression from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
//
// Each params object lists "max" before "n" — nControl's range depends
// reactively on maxN, so its view gets recreated when max changes;
// VM.ui.applyExampleParams applies params in this order with a yield
// between each, so the freshly-recreated slider is what "n" ends up
// applied to.
export const examples = [
  {
    title: "Signed area cancellation",
    params: {f: "x^3 - x", a: "-1", b: "2", max: "40", n: "6"}
  },
  {
    title: "Oscillatory integral",
    params: {f: "sin(5*x)", a: "0", b: "3", max: "80", n: "12"}
  },
  {
    title: "Nonsmooth corner",
    params: {f: "abs(x - 0.3)", a: "-1", b: "2", max: "50", n: "8"}
  },
  {
    title: "Square-root singularity",
    params: {f: "sqrt(x)", a: "0", b: "1", max: "50", n: "8"}
  },
  {
    title: "Rational peak",
    params: {f: "1/(1 + x^2)", a: "0", b: "5", max: "60", n: "10"}
  },
  {
    title: "Sine area on a quarter-period",
    params: {f: "sin(x)", a: "0", b: "pi/2", max: "40", n: "6"}
  },
  {
    title: "Simpson's rule needs even n",
    params: {f: "sin(x)", a: "0", b: "pi/2", max: "35", n: "5"}
  }
]

// The four rules, in legend order: the key of each one's error in a row of
// integrate's rows, and its short name.
export const rules = [
  {errorKey: "leftError", name: "left"},
  {errorKey: "midpointError", name: "midpoint"},
  {errorKey: "trapezoidalError", name: "trapezoidal"},
  {errorKey: "simpsonError", name: "simpson"}
]

// Reference integral of f over [lo, hi]: adaptive Simpson's rule, which
// keeps halving only the subintervals whose estimate hasn't settled to near
// machine precision. A fixed fine grid isn't enough: next to a singularity
// like sqrt(x) at 0 it is still off by ~1e-7, which would put a false floor
// under every method's error. Recursion depth and the total number of
// evaluations are capped, so a pathological f can't hang the page.
export function referenceIntegral(f, lo, hi) {
  const maxDepth = 40
  const maxEvaluations = 100000
  let evaluations = 0
  const refine = (left, right, fLeft, fMid, fRight, whole, tolerance, depth) => {
    const mid = (left + right) / 2
    const fLeftMid = f((left + mid) / 2)
    const fRightMid = f((mid + right) / 2)
    evaluations += 2
    const leftPart = (mid - left) / 6 * (fLeft + 4 * fLeftMid + fMid)
    const rightPart = (right - mid) / 6 * (fMid + 4 * fRightMid + fRight)
    const change = leftPart + rightPart - whole
    // f is undefined somewhere here (1/x at 0): refining can't fix that.
    if (!Number.isFinite(change)) return NaN
    if (depth >= maxDepth || evaluations >= maxEvaluations || Math.abs(change) <= 15 * tolerance) {
      return leftPart + rightPart + change / 15
    }
    return refine(left, mid, fLeft, fLeftMid, fMid, leftPart, tolerance / 2, depth + 1)
      + refine(mid, right, fMid, fRightMid, fRight, rightPart, tolerance / 2, depth + 1)
  }
  // An integrable singularity at an endpoint (log(x), 1/sqrt(x) on [0, 1])
  // makes f(lo) or f(hi) infinite. Count it as 0, the way the sums below
  // skip a non-finite sample: the area it leaves out shrinks with the
  // refinement, and is far below any rule's error at these n. A non-finite
  // value in the interior (1/x across 0) still makes the reference NaN.
  let fLo = f(lo)
  if (!Number.isFinite(fLo)) fLo = 0
  const fMidpoint = f((lo + hi) / 2)
  let fHi = f(hi)
  if (!Number.isFinite(fHi)) fHi = 0
  const coarse = (hi - lo) / 6 * (fLo + 4 * fMidpoint + fHi)
  return refine(lo, hi, fLo, fMidpoint, fHi, coarse, 1e-13 * Math.max(1, Math.abs(coarse)), 0)
}

// Runs every rule for n = 1..maxN subintervals of [lo, hi].
//   rows — array of { n, leftArea, midpointArea, trapezoidalArea, simpsonArea,
//     trueIntegral, leftError, midpointError, trapezoidalError, simpsonError },
//     one entry per n. simpsonArea/simpsonError are NaN when n is odd.
//   trueIntegral — the reference integral, shared by every row
export function integrate(f, lo, hi, maxN) {
  const VM = globalThis.VM
  const trueIntegral = referenceIntegral(f, lo, hi)

  const rows = []
  let n = 1
  while (n <= maxN) {
    const h = (hi - lo) / n

    // Left Riemann sum
    let leftArea = 0
    for (let i = 0; i < n; i++) {
      const x = lo + i * h
      const y = f(x)
      if (Number.isFinite(y)) leftArea += y * h
    }

    // Midpoint Riemann sum
    let midpointArea = 0
    for (let i = 0; i < n; i++) {
      const mid = lo + (i + 0.5) * h
      const y = f(mid)
      if (Number.isFinite(y)) midpointArea += y * h
    }

    // Trapezoidal rule
    let trapezoidalArea = 0
    {
      const y0 = f(lo)
      const yn = f(hi)
      let sum = 0
      if (Number.isFinite(y0)) sum += y0 / 2
      if (Number.isFinite(yn)) sum += yn / 2
      for (let i = 1; i < n; i++) {
        const y = f(lo + i * h)
        if (Number.isFinite(y)) sum += y
      }
      trapezoidalArea = sum * h
    }

    // Simpson's rule needs an even number of subintervals.
    let simpsonArea = NaN
    if (n % 2 === 0) simpsonArea = VM.numerical.simpsonEstimate(f, lo, hi, n)

    const leftError = Math.abs(leftArea - trueIntegral)
    const midpointError = Math.abs(midpointArea - trueIntegral)
    const trapezoidalError = Math.abs(trapezoidalArea - trueIntegral)
    let simpsonError = NaN
    if (Number.isFinite(simpsonArea)) simpsonError = Math.abs(simpsonArea - trueIntegral)

    rows.push({n, leftArea, midpointArea, trapezoidalArea, simpsonArea, trueIntegral, leftError, midpointError, trapezoidalError, simpsonError})
    n++
  }

  return {rows, trueIntegral}
}
