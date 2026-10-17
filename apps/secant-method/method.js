/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Secant Method page's examples, methods and convergence fit, imported
// by its OJS cells and by method.test.js, which checks every example's
// fitted orders. Uses VM.numerical.linearRegression from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls. They
// deliberately don't set the method: each gives both starting pairs (x₀, x₁)
// and triples (x₀, x₁, x₂), so the reader can flip the Method toggle and
// compare secant and IQI on the same problem.
export const examples = [
  {
    title: "Simple root: IQI takes fewer steps",
    params: {max: "20", f: "x^3 - x - 2", x0: "1", x1: "2", x2: "1.5"}
  },
  {
    title: "Secant wanders, IQI converges",
    params: {max: "20", f: "x^3 - 2*x + 2", x0: "-2", x1: "0", x2: "-1"}
  },
  {
    title: "Secant converges, IQI diverges",
    params: {max: "20", f: "atan(x)", x0: "1", x1: "2", x2: "1.5"}
  },
  {
    title: "Triple root: both slow to linear",
    params: {max: "20", f: "x^3", x0: "-0.5", x1: "0.8", x2: "0.3"}
  }
]

// inverseInterpolant evaluates, at height y, the polynomial x = q(y) that
// passes through every node (x_k, f(x_k)) -- Lagrange interpolation with the
// roles of x and y swapped. Through two nodes q is the secant line; through
// three it is the sideways parabola of inverse quadratic interpolation.
// Either way the next iterate is q(0), where the interpolant meets the x-axis.
export function inverseInterpolant(nodes, y) {
  let x = 0
  for (let j = 0; j < nodes.length; j++) {
    let term = nodes[j].x
    for (let k = 0; k < nodes.length; k++) {
      if (k === j) continue
      term *= (y - nodes[k].fx) / (nodes[j].fx - nodes[k].fx)
    }
    x += term
  }
  return x
}

// runMethod iterates from the given initial guesses: two for the secant
// method, three for inverse quadratic interpolation (each step interpolates
// the last guesses.length points). Returns
//   rows   — array of { i, nodes, xNext, error }, one entry per iteration;
//            nodes are the points interpolated at that step, oldest first,
//            each { i, x, fx }
//   points — every x visited so far, x_0, x_1, ..., x_N (used for the
//            iterates plot, which needs the initial guesses too)
export function runMethod(f, initialGuesses, maxIterations) {
  for (const guess of initialGuesses) {
    if (!Number.isFinite(guess)) return {rows: [], points: []}
  }

  const nodeCount = initialGuesses.length
  const points = []
  for (const x of initialGuesses) points.push({x, fx: f(x)})
  const rows = []

  let i = nodeCount - 1
  while (rows.length < maxIterations) {
    const nodes = []
    for (let k = i - nodeCount + 1; k <= i; k++) nodes.push({i: k, x: points[k].x, fx: points[k].fx})
    const curr = nodes[nodes.length - 1]

    // Stop if any node's f-value blew up — the method has diverged.
    let diverged = false
    for (const node of nodes) {
      if (!Number.isFinite(node.fx)) diverged = true
    }
    if (diverged) {
      rows.push({i, nodes, xNext: NaN, error: NaN})
      return {rows, points}
    }

    // Stop if a node is already an exact root.
    let root = null
    for (const node of nodes) {
      if (node.fx === 0 && root === null) root = node
    }
    if (root) {
      rows.push({i, nodes, xNext: root.x, error: 0})
      return {rows, points}
    }

    // Stop if two nodes share (nearly) the same f-value — the interpolant
    // x = q(y) would have to divide by their difference.
    let degenerate = false
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        if (Math.abs(nodes[a].fx - nodes[b].fx) < 1e-14) degenerate = true
      }
    }
    if (degenerate) {
      rows.push({i, nodes, xNext: NaN, error: NaN})
      return {rows, points}
    }

    const xNext = inverseInterpolant(nodes, 0)
    const error = Math.abs(xNext - curr.x)
    rows.push({i, nodes, xNext, error})

    points.push({x: xNext, fx: f(xNext)})
    i++
  }
  return {rows, points}
}

// The convergence plot's data for one run: log₁₀|eₙ₊₁| against log₁₀|eₙ| for
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
