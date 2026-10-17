/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Fixed-Point Iteration page's examples, method and convergence fit,
// imported by its OJS cells and by method.test.js, which checks every
// example's fitted slope. Uses VM.numerical.linearRegression from the
// mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
export const examples = [
  {
    title: "Classic convergent iteration",
    params: {max: "20", g: "cos(x)", x0: "1"}
  },
  {
    title: "Converges to the positive fixed point",
    params: {max: "20", g: "sqrt(x + 2)", x0: "1"}
  },
  {
    title: "Chaotic wandering",
    params: {max: "20", g: "2*cos(x)", x0: "1"}
  },
  {
    title: "Repelling fixed point",
    params: {max: "20", g: "2*x", x0: "0.1"}
  },
  {
    title: "Divergent oscillation",
    params: {max: "20", g: "1 - 2*x", x0: "0.2"}
  },
  {
    title: "Neutral two-cycle",
    params: {max: "20", g: "1 - x", x0: "0.2"}
  },
  {
    title: "Very slow convergence",
    params: {max: "20", g: "x - x^3", x0: "0.2"}
  }
]

// Runs xₙ₊₁ = g(xₙ) from x0 for at most maxIterations steps. Returns rows,
// an array of { i, x, gx, error }, one entry per iteration, where error is
// |g(xₙ) − xₙ|; empty when x0 isn't a number.
export function iterate(g, x0, maxIterations) {
  if (!Number.isFinite(x0)) return []

  const rows = []
  let x = x0
  let i = 0
  while (i < maxIterations) {
    const gx = g(x)

    // Stop if g(x) blows up — the iteration has diverged.
    if (!Number.isFinite(gx)) {
      rows.push({i, x, gx, error: NaN})
      return rows
    }

    const error = Math.abs(gx - x)
    rows.push({i, x, gx, error})

    x = gx
    i++
  }
  return rows
}

// The convergence plot's data: log₁₀|xₙ − g(xₙ)| against n, and the slope
// the legend reports. Returns {points, fit, slope}:
//   points — {n, y: log10 error} for every finite, nonzero error
//   fit — VM.numerical.linearRegression over points (x = n), or null
//   slope — fit.slope, or NaN without a fit
export function convergenceFit(rows) {
  const VM = globalThis.VM
  const points = []
  for (const r of rows) {
    if (Number.isFinite(r.error) && r.error > 0) {
      points.push({n: r.i, y: Math.log10(r.error)})
    }
  }

  const regressionPoints = []
  for (const point of points) regressionPoints.push({x: point.n, y: point.y})
  const fit = VM.numerical.linearRegression(regressionPoints)
  let slope = NaN
  if (fit) slope = fit.slope
  return {points, fit, slope}
}
