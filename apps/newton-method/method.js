/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Newton's Method page's examples, method and convergence fit, imported by
// its OJS cells and by method.test.js, which checks every example's fitted
// order. Uses VM.numerical.linearRegression from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
export const examples = [
  {
    title: "Fast quadratic convergence",
    params: {max: "20", f: "x^2 - 2", x0: "1.5"}
  },
  {
    title: "A two-cycle failure",
    params: {max: "20", f: "x^3 - 2*x + 2", x0: "0"}
  },
  {
    title: "Looks unstable, then converges",
    params: {max: "20", f: "x^3 - 2*x + 2", x0: "0.95"}
  },
  {
    title: "Slow convergence at a multiple root",
    params: {max: "20", f: "x^3", x0: "0.2"}
  },
  {
    title: "Nearly flat tangent",
    params: {max: "20", f: "x^3 - 2*x + 2", x0: "0.83"}
  },
  {
    title: "Large jumps from shallow slopes",
    params: {max: "20", f: "atan(x)", x0: "1.4"}
  }
]

// Runs Newton's method from x0 for at most maxIterations steps. Returns
// rows, an array of { i, x, fx, dfx, xNext, error }, one entry per
// iteration, where error is |xₙ₊₁ − xₙ|; empty when x0 isn't a number.
export function newton(f, df, x0, maxIterations) {
  if (!Number.isFinite(x0)) return []

  const rows = []
  let x = x0
  let i = 0
  while (i < maxIterations) {
    const fx  = f(x)
    const dfx = df(x)

    // Stop if f or f' blows up — the method has diverged.
    if (!Number.isFinite(fx) || !Number.isFinite(dfx)) {
      rows.push({i, x, fx, dfx, xNext: NaN, error: NaN})
      return rows
    }

    // Stop if the tangent is nearly flat — dividing by dfx would be unstable.
    if (Math.abs(dfx) < 1e-14) {
      rows.push({i, x, fx, dfx, xNext: NaN, error: NaN})
      return rows
    }

    const xNext = x - fx / dfx        // Newton update: x-intercept of the tangent
    const error = Math.abs(xNext - x)
    rows.push({i, x, fx, dfx, xNext, error})

    x = xNext
    i++
  }
  return rows
}

// The convergence plot's data: log₁₀|eₙ₊₁| against log₁₀|eₙ| for
// successive errors, whose slope is the order of convergence p. Two things
// keep that order honest:
//   - an error at rounding level (below 1e-12·max(1, |xₙ₊₁|)) is dropped.
//     Once the iterates stop changing, the errors sit at ~1e-16 and each
//     pair (−16, −16) pulls the slope toward 1.
//   - the line is fitted only to the trailing run of steps where the error
//     shrinks. A run that diverges or wanders has no order to report, and
//     the steps before the method settles skew the slope.
// Returns {points, fit, order}:
//   points — {x: log10 eₙ, y: log10 eₙ₊₁} for every pair above rounding level
//   fit — VM.numerical.linearRegression over the trailing shrinking run, or null
//   order — fit.slope, or NaN without a fit
export function convergenceFit(rows) {
  const VM = globalThis.VM
  const points = []
  // aboveFloor[k]: whether rows[k].error is a real, nonzero error.
  const aboveFloor = []
  for (const row of rows) {
    const roundoffFloor = 1e-12 * Math.max(1, Math.abs(row.xNext))
    aboveFloor.push(Number.isFinite(row.error) && row.error > roundoffFloor)
  }
  for (let k = 0; k < rows.length - 1; k++) {
    if (aboveFloor[k] && aboveFloor[k + 1]) {
      points.push({x: Math.log10(rows[k].error), y: Math.log10(rows[k + 1].error)})
    }
  }

  let tailStart = points.length
  while (tailStart > 0 && points[tailStart - 1].y < points[tailStart - 1].x) tailStart--
  const fit = VM.numerical.linearRegression(points.slice(tailStart))
  let order = NaN
  if (fit) order = fit.slope
  return {points, fit, order}
}
