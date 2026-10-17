/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Explicit ODE Methods page's examples, methods and convergence fit,
// imported by its OJS cells and by method.test.js, which checks every
// example's fitted orders. Uses VM.numerical.eulerSolve, rk4Solve and
// linearRegression from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
//
// Each params object lists "max" before "n" — nControl's range depends
// reactively on maxN, so its view gets recreated when max changes;
// VM.ui.applyExampleParams applies params in this order with a yield
// between each, so the freshly-recreated slider is what "n" ends up
// applied to.
//
// Each max is large enough for every method to reach its asymptotic order
// in the convergence plot, which fits n ≥ max/2 (method.test.js checks it).
// A stiff equation needs n well past λ²b/2 for that, so the stiff example
// runs on a short interval.
export const examples = [
  {
    title: "Stiff-looking decay",
    params: {f: "-15*y", y0: "1", b: "0.5", max: "160", n: "3"}
  },
  {
    title: "Fast attraction to cos(t)",
    params: {f: "-10*(y - cos(t)) - sin(t)", y0: "0", b: "3", max: "240", n: "12"}
  },
  {
    title: "Oscillatory forcing with growth",
    params: {f: "y + sin(5*t)", y0: "0", b: "3", max: "80", n: "10"}
  },
  {
    title: "Logistic growth",
    params: {f: "y*(1 - y)", y0: "0.1", b: "8", max: "60", n: "8"}
  },
  {
    title: "Nonlinear Riccati-type equation",
    params: {f: "y^2 - t", y0: "0", b: "2", max: "80", n: "8"}
  },
  {
    title: "Textbook nonlinear forcing",
    params: {f: "y - t^2 + 1", y0: "0.5", b: "2", max: "40", n: "4"}
  }
]

// The three methods, in legend order: the key of each one's error in a row
// of endpointErrors' rows, and its name.
export const methodErrors = [
  {errorKey: "eulerError", name: "Euler"},
  {errorKey: "improvedEulerError", name: "Improved Euler"},
  {errorKey: "rk4Error", name: "RK4"}
]

// improvedEulerSolve(f, t0, y0, tEnd, n) advances y' = f(t, y), y(t0) = y0
// with n steps of the improved Euler / explicit trapezoidal method: Euler's
// method as a predictor, then averages the slope at both endpoints of the
// step. Returns the full trajectory {ts, ys}.
export function improvedEulerSolve(f, t0, y0, tEnd, n) {
  const h = (tEnd - t0) / n
  const ts = [t0]
  const ys = [y0]
  let t = t0, y = y0
  for (let i = 0; i < n; i++) {
    const k1 = f(t, y)
    const predictor = y + h * k1
    const tNext = t0 + (i + 1) * h
    const k2 = f(tNext, predictor)
    y = y + (h / 2) * (k1 + k2)
    t = tNext
    ts.push(t)
    ys.push(y)
  }
  return {ts, ys}
}

// Solves y' = f(t, y), y(0) = y0 up to t = b with every method, for each
// step count n = 1..maxN.
//   rows — array of { n, eulerValue, improvedEulerValue, rk4Value, trueValue,
//     eulerError, improvedEulerError, rk4Error }, one entry per n — the
//     computed y(b) for each method against a reference value.
//   trueValue — reference y(b), shared by every row
export function endpointErrors(f, y0, b, maxN) {
  const VM = globalThis.VM
  const t0 = 0

  // Reference value: RK4 with a very fine step count, far finer than any n
  // tested below.
  const refSteps = 2000
  const trueValue = VM.numerical.rk4Solve(f, t0, y0, b, refSteps).ys[refSteps]

  const rows = []
  let n = 1
  while (n <= maxN) {
    const eulerValue = VM.numerical.eulerSolve(f, t0, y0, b, n).ys[n]
    const improvedEulerValue = improvedEulerSolve(f, t0, y0, b, n).ys[n]
    const rk4Value = VM.numerical.rk4Solve(f, t0, y0, b, n).ys[n]

    const eulerError = Math.abs(eulerValue - trueValue)
    const improvedEulerError = Math.abs(improvedEulerValue - trueValue)
    const rk4Error = Math.abs(rk4Value - trueValue)

    rows.push({n, eulerValue, improvedEulerValue, rk4Value, trueValue, eulerError, improvedEulerError, rk4Error})
    n++
  }

  return {rows, trueValue}
}

// The convergence plot's data for one method: its log-log error points and
// the order the legend reports. Two things keep that order honest:
//   - an error at rounding level (below roundoffFloor) is not plotted. A
//     method that is exact for this equation would otherwise scatter noise
//     around 1e-15 and get a meaningless slope; it is reported as exact
//     instead.
//   - the line is fitted to n ≥ maxN/2 only. For small n a method hasn't
//     settled into its asymptotic rate yet, and those points skew the slope.
// Returns {points, fit, order, exact, exactFromN}:
//   points — {x: log10 n, y: log10 error} for every error above the floor
//   fit — VM.numerical.linearRegression over the tail, or null
//   order — -fit.slope, or NaN without a fit
//   exact — true when every finite error is at rounding level
//   exactFromN — the first n from which every error is at rounding level,
//     or null if the last error is still above it
export function convergenceFit(rows, trueValue, errorKey) {
  const VM = globalThis.VM
  const roundoffFloor = 1e-12 * Math.max(1, Math.abs(trueValue))
  const tailStart = Math.log10(rows.length / 2)

  const points = []
  const tail = []
  let finiteErrors = 0
  let exactFromN = null
  for (const row of rows) {
    const error = row[errorKey]
    if (!Number.isFinite(error)) continue
    finiteErrors++
    if (error <= roundoffFloor) {
      if (exactFromN === null) exactFromN = row.n
      continue
    }
    exactFromN = null
    const point = {x: Math.log10(row.n), y: Math.log10(error)}
    points.push(point)
    if (point.x >= tailStart) tail.push(point)
  }

  const exact = finiteErrors > 0 && points.length === 0
  let fit = null
  if (!exact) fit = VM.numerical.linearRegression(tail)
  let order = NaN
  if (fit) order = -fit.slope
  return {points, fit, order, exact, exactFromN}
}
