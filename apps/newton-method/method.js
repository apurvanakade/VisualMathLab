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
