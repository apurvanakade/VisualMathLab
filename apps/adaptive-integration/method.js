/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Adaptive Integration page's examples, method, tolerance sweep and
// convergence fit, imported by its OJS cells and by method.test.js, which
// checks what its convergence plots show for every example. Uses
// VM.numerical.simpsonEstimate from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
// The first is the page's default: its fields open on these values.
export const examples = [
  {
    title: "Steep transition",
    // The step is at 1/pi, not a round number: tanh is odd about its step,
    // so a uniform grid with a node there (at 0.2, every grid with a
    // multiple of 20 subintervals) has errors that cancel to rounding level,
    // a coincidence the cost plot would show as dips.
    params: {max: "15", f: "tanh(20*(x - 1/pi))", a: "-1", b: "1"}
  },
  {
    title: "Challenging oscillations",
    params: {max: "15", f: "sin(1/x)", a: "0.05", b: "1"}
  },
  {
    title: "Narrow spike",
    params: {max: "15", f: "1/(0.01 + x^2)", a: "-1", b: "1"}
  },
  {
    title: "Nonsmooth corner",
    // [-2, pi], not [-2, 2]: with the corner at the first midpoint, Simpson's
    // rule is exact from the first split on and there is no error to plot.
    // The irrational endpoint keeps 0 off every panel edge, of the adaptive
    // rule and of every uniform grid (on [-2, 3] the grids with a multiple
    // of 20 subintervals are exact). The adaptive rule keeps halving the one
    // panel that holds the corner, about 3.3 levels per decimal of ε: hence
    // Max 40.
    params: {max: "40", f: "abs(x)", a: "-2", b: "pi"}
  },
  {
    title: "Endpoint behavior",
    params: {max: "40", f: "sqrt(x)", a: "0", b: "1"}
  }
]

// The convergence plots' sweep over the tolerance slider's range,
// ε = 10^-e for e = 1, 1.25, …, 10: every slider value and one between each
// pair, so the curves are smooth and the slider's ε is always on them.
export const toleranceExponents = []
for (let i = 4; i <= 40; i++) toleranceExponents.push(i / 4)

// Reference integral of f over [lo, hi]: adaptive Simpson's rule run to
// near machine precision. A fixed fine grid isn't enough: next to a
// singularity like sqrt(x) at 0, composite Simpson with 4000 panels is
// still off by ~1e-7, a false floor under every error the plots show.
// Recursion depth and evaluations are capped, so a pathological f can't
// hang the page. (The same routine as numerical-integration's.)
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
    if (!Number.isFinite(change)) return NaN
    if (depth >= maxDepth || evaluations >= maxEvaluations || Math.abs(change) <= 15 * tolerance) {
      return leftPart + rightPart + change / 15
    }
    return refine(left, mid, fLeft, fLeftMid, fMid, leftPart, tolerance / 2, depth + 1)
      + refine(mid, right, fMid, fRightMid, fRight, rightPart, tolerance / 2, depth + 1)
  }
  let fLo = f(lo)
  if (!Number.isFinite(fLo)) fLo = 0
  const fMidpoint = f((lo + hi) / 2)
  let fHi = f(hi)
  if (!Number.isFinite(fHi)) fHi = 0
  const coarse = (hi - lo) / 6 * (fLo + 4 * fMidpoint + fHi)
  return refine(lo, hi, fLo, fMidpoint, fHi, coarse, 1e-13 * Math.max(1, Math.abs(coarse)), 0)
}

// Adaptive Simpson quadrature of f on [lo, hi] at tolerance ε, recursing
// until each panel's error estimate is within its share of ε, or maxDepth
// is reached.
//   leaves — array of { a, b, mid, fa, fmid, fb, estimate, errorEstimate,
//     depth, width }, one entry per accepted panel, left to right
//   totalEstimate — sum of leaf estimates (the adaptive rule's answer)
//   totalErrorEstimate — sum of leaf error estimates |E|
//   evaluations — how many times f was evaluated: 3 for the first panel,
//     then 2 for every panel tested after it, 4 · leaves + 1 in all
// Returns null when f(lo) or f(hi) isn't finite.
export function adaptiveSimpson(f, lo, hi, tolerance, maxDepth) {
  const fa = f(lo)
  const fb = f(hi)
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null

  // Safety valve: caps total leaves so a pathological (e.g. non-converging
  // or discontinuous) function can't hang the browser with an exponential
  // blow-up of subdivisions.
  const maxLeaves = 4000
  let evaluations = 0

  // Simpson's rule on [x0, x1], reusing the already-evaluated endpoint
  // values y0, y1 and computing only the new midpoint value.
  const simpsonPiece = (x0, x1, y0, y1) => {
    const mid = (x0 + x1) / 2
    const ymid = f(mid)
    evaluations++
    const value = (x1 - x0) / 6 * (y0 + 4 * ymid + y1)
    return {mid, ymid, value}
  }

  const leaves = []

  const recurse = (a0, b0, fa0, fmid0, fb0, whole, tol, depth) => {
    const c = (a0 + b0) / 2

    if (leaves.length >= maxLeaves) {
      leaves.push({a: a0, b: b0, mid: c, fa: fa0, fmid: fmid0, fb: fb0, estimate: whole, errorEstimate: 0, depth, width: b0 - a0})
      return
    }

    const left = simpsonPiece(a0, c, fa0, fmid0)
    const right = simpsonPiece(c, b0, fmid0, fb0)
    const combined = left.value + right.value
    const errorEst = (combined - whole) / 15

    if (!Number.isFinite(combined) || depth >= maxDepth || Math.abs(combined - whole) <= 15 * tol) {
      leaves.push({a: a0, b: b0, mid: c, fa: fa0, fmid: fmid0, fb: fb0, estimate: combined, errorEstimate: Math.abs(errorEst), depth, width: b0 - a0})
      return
    }

    recurse(a0, c, fa0, left.ymid, fmid0, left.value, tol / 2, depth + 1)
    recurse(c, b0, fmid0, right.ymid, fb0, right.value, tol / 2, depth + 1)
  }

  evaluations = 2
  const whole0 = simpsonPiece(lo, hi, fa, fb)
  recurse(lo, hi, fa, whole0.ymid, fb, whole0.value, tolerance, 0)

  let totalEstimate = 0
  let totalErrorEstimate = 0
  for (const leaf of leaves) {
    totalEstimate += leaf.estimate
    totalErrorEstimate += leaf.errorEstimate
  }

  return {leaves, totalEstimate, totalErrorEstimate, evaluations}
}

// Runs the adaptive rule at every tolerance in toleranceExponents and, at
// each, the same rule on equal panels with the same number of function
// evaluations, so the two are compared at equal cost. The adaptive rule
// accepts each panel's finer estimate S₂, Simpson's rule on its two
// halves, so the uniform rule is composite Simpson's rule with
// n = evaluations − 1 subintervals (even, since evaluations = 4 · panels + 1).
// The method never adds its error estimate E = (S₂ − S₁)/15 back in, so E
// estimates the error of the very answer it reports.
//   rows — one per tolerance, tightest last: { exponent, tolerance,
//     evaluations, panels, depthLimited, adaptiveError, estimatedError,
//     uniformError }. depthLimited is true when some panel was accepted
//     only because it reached maxDepth, so ε need not have been met.
//   trueIntegral — the reference integral
// rows is empty when f(lo) or f(hi) isn't finite.
export function toleranceSweep(f, lo, hi, maxDepth) {
  const VM = globalThis.VM
  const trueIntegral = referenceIntegral(f, lo, hi)
  const rows = []
  for (const exponent of toleranceExponents) {
    const tolerance = Math.pow(10, -exponent)
    const run = adaptiveSimpson(f, lo, hi, tolerance, maxDepth)
    if (!run) continue
    const uniform = VM.numerical.simpsonEstimate(f, lo, hi, run.evaluations - 1)
    let depthLimited = false
    for (const leaf of run.leaves) {
      if (leaf.depth >= maxDepth) depthLimited = true
    }
    rows.push({
      exponent,
      tolerance,
      evaluations: run.evaluations,
      panels: run.leaves.length,
      depthLimited,
      adaptiveError: Math.abs(run.totalEstimate - trueIntegral),
      estimatedError: run.totalErrorEstimate,
      uniformError: Math.abs(uniform - trueIntegral)
    })
  }
  return {rows, trueIntegral}
}

// The points of one error series on a log-log plot: { x: log₁₀ of xKey,
// y: log₁₀ error, exponent }, skipping errors at rounding level
// (≤ 1e-15 · max(1, |reference|), which includes an exact 0), which have
// no meaningful logarithm.
export function logPoints(rows, reference, xKey, errorKey) {
  const floor = 1e-15 * Math.max(1, Math.abs(reference))
  const points = []
  for (const row of rows) {
    const error = row[errorKey]
    if (!Number.isFinite(error) || error <= floor) continue
    points.push({x: Math.log10(row[xKey]), y: Math.log10(error), exponent: row.exponent})
  }
  return points
}

// The points of one error series measured against the tolerance it was run
// at: { exponent, y: log₁₀ (error / ε) }, so y = 0 is "error = ε" and a
// point above it missed the tolerance. Skips errors at rounding level, as
// logPoints does.
export function tolerancePoints(rows, reference, errorKey) {
  const floor = 1e-15 * Math.max(1, Math.abs(reference))
  const points = []
  for (const row of rows) {
    const error = row[errorKey]
    if (!Number.isFinite(error) || error <= floor) continue
    points.push({exponent: row.exponent, y: Math.log10(error / row.tolerance)})
  }
  return points
}
