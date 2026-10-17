/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Polynomial Interpolation page's examples, cubic spline, arc lengths
// and convergence fit, imported by its OJS cells and by method.test.js,
// which checks every example's fitted orders. Uses
// VM.numerical.linearRegression from the mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
//
// Each params object lists "max" before "n" — nControl's range depends
// reactively on maxN, so its view gets recreated when max changes;
// VM.ui.applyExampleParams applies params in this order with a yield
// between each, so the freshly-recreated slider is what "n" ends up
// applied to.
//
// Each max is large enough for both interpolants to reach their
// asymptotic order in the convergence plot, which fits n ≥ max/2
// (method.test.js checks it).
export const examples = [
  {
    title: "Sine on one full period",
    params: {f: "sin(x)", a: "0", b: "2*pi", max: "40", n: "10"}
  },
  {
    title: "Rational peak",
    params: {f: "1/(1+x^2)", a: "-5", b: "5", max: "80", n: "5"}
  },
  {
    title: "Nonsmooth corner",
    params: {f: "abs(x)", a: "-2", b: "2", max: "60", n: "4"}
  },
  {
    title: "Cubic polynomial",
    params: {f: "x^3-x", a: "-2", b: "2", max: "60", n: "4"}
  }
]

// The two interpolants, in legend order: the key of each one's error in a
// row of arcLengthErrors' rows, and its short name.
export const interpolantErrors = [
  {errorKey: "linearError", name: "linear"},
  {errorKey: "cubicError", name: "cubic"}
]

// Coefficients of the natural cubic spline through the points (xs[i], ys[i]):
// on [xs[i], xs[i+1]] it is ys[i] + b[i] dx + c[i] dx² + d[i] dx³, with
// dx = x − xs[i]. xs must be sorted ascending. Returns {b, c, d}, or null if
// there are fewer than two points.
//
// Standard tridiagonal (Thomas algorithm) solve for the second-derivative
// coefficients, with natural boundary conditions (zero second derivative
// at both endpoints).
export function splineCoefficients(xs, ys) {
  const n = xs.length - 1
  if (n < 1) return null

  const h = []
  for (let i = 0; i < n; i++) h.push(xs[i + 1] - xs[i])

  const alpha = new Array(n + 1).fill(0)
  for (let i = 1; i < n; i++) {
    alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1])
  }

  const l  = new Array(n + 1).fill(0)
  const mu = new Array(n + 1).fill(0)
  const z  = new Array(n + 1).fill(0)
  l[0] = 1
  for (let i = 1; i < n; i++) {
    l[i]  = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]
    mu[i] = h[i] / l[i]
    z[i]  = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
  }
  l[n] = 1

  const c = new Array(n + 1).fill(0)
  const b = new Array(n).fill(0)
  const d = new Array(n).fill(0)
  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1]
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3
    d[j] = (c[j + 1] - c[j]) / (3 * h[j])
  }
  return {b, c, d}
}

// Builds the natural cubic spline through the points (xs[i], ys[i]) and
// returns a JS function (x => number) that evaluates it. xs must be sorted
// ascending. Returns null if there are fewer than two points.
export function cubicSpline(xs, ys) {
  const coefficients = splineCoefficients(xs, ys)
  if (!coefficients) return null
  const {b, c, d} = coefficients
  const n = xs.length - 1

  return x => {
    let i = n - 1
    if (x <= xs[0]) {
      i = 0
    } else if (x >= xs[n]) {
      i = n - 1
    } else {
      // Binary search for the interval [xs[i], xs[i+1]] holding x, so an
      // evaluation costs O(log n) rather than a scan over every interval
      // (the page samples n + 1 splines at O(n) points each).
      let left = 0
      let right = n
      while (right - left > 1) {
        const mid = Math.floor((left + right) / 2)
        if (xs[mid] <= x) {
          left = mid
        } else {
          right = mid
        }
      }
      i = left
    }
    const dx = x - xs[i]
    return ys[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx
  }
}

// Five-point Gauss–Legendre nodes and weights on [-1, 1].
const gaussNodes = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664]
const gaussWeights = [0.5688888888888889, 0.47862867049936647, 0.47862867049936647, 0.23692688505618908, 0.23692688505618908]

// Arc length of the natural cubic spline through (xs[i], ys[i]): the
// integral of √(1 + s'(x)²) over each piece, by five-point Gauss–Legendre.
// The integrand is smooth on a piece, so this is accurate to rounding for
// the n the page uses; summing chords along the spline instead would add
// an error of its own, larger than the spline's, and the convergence plot
// would measure that. NaN if any y is not finite or there are fewer than
// two points.
export function splineArcLength(xs, ys) {
  for (const y of ys) {
    if (!Number.isFinite(y)) return NaN
  }
  const coefficients = splineCoefficients(xs, ys)
  if (!coefficients) return NaN
  const {b, c, d} = coefficients

  let length = 0
  for (let i = 0; i < xs.length - 1; i++) {
    const half = (xs[i + 1] - xs[i]) / 2
    for (let k = 0; k < gaussNodes.length; k++) {
      const dx = half * (1 + gaussNodes[k])
      const slope = b[i] + 2 * c[i] * dx + 3 * d[i] * dx * dx
      length += gaussWeights[k] * half * Math.sqrt(1 + slope * slope)
    }
  }
  return length
}

// Sum of the chord lengths of f's graph over count equal steps of [lo, hi],
// skipping a chord with a non-finite end.
function chordLength(f, lo, hi, count) {
  let length = 0
  let xPrev = lo
  let yPrev = f(xPrev)
  for (let k = 1; k <= count; k++) {
    const x = lo + (hi - lo) * k / count
    const y = f(x)
    if (Number.isFinite(yPrev) && Number.isFinite(y)) {
      const dx = x - xPrev
      const dy = y - yPrev
      length += Math.sqrt(dx * dx + dy * dy)
    }
    xPrev = x
    yPrev = y
  }
  return length
}

// Reference arc length of f over [lo, hi]. A chord sum over N steps is off
// by about C/N² for a smooth f, so one Richardson step,
// (4·L(2N) − L(N)) / 3, cancels that term. A plain 4000-step chord sum is
// off by ~1e-7, about the cubic spline's own error at n = 40, which would
// flatten its convergence plot.
export function referenceArcLength(f, lo, hi) {
  const coarse = chordLength(f, lo, hi, 4000)
  const fine = chordLength(f, lo, hi, 8000)
  return (4 * fine - coarse) / 3
}

// For n = 1..maxN equal subintervals of [lo, hi], the arc lengths of the
// linear interpolant and the cubic spline through f's values at the nodes.
//   rows — array of { n, linearLength, cubicLength, trueArcLength,
//     linearError, cubicError }, one entry per n
//   trueArcLength — reference arc length of f itself, shared by every row
export function arcLengthErrors(f, lo, hi, maxN) {
  const trueArcLength = referenceArcLength(f, lo, hi)

  const rows = []
  let n = 1
  while (n <= maxN) {
    // n+1 equally spaced interpolation nodes over [lo, hi]
    const nodesX = []
    const nodesY = []
    for (let k = 0; k <= n; k++) {
      const x = lo + (hi - lo) * k / n
      nodesX.push(x)
      nodesY.push(f(x))
    }

    // Linear interpolant arc length: exact sum of segment lengths.
    let linearLength = 0
    for (let k = 0; k < n; k++) {
      const dx = nodesX[k + 1] - nodesX[k]
      const dy = nodesY[k + 1] - nodesY[k]
      if (Number.isFinite(dy)) linearLength += Math.sqrt(dx * dx + dy * dy)
    }

    const cubicLength = splineArcLength(nodesX, nodesY)

    const linearError = Math.abs(linearLength - trueArcLength)
    let cubicError = NaN
    if (Number.isFinite(cubicLength)) cubicError = Math.abs(cubicLength - trueArcLength)

    rows.push({n, linearLength, cubicLength, trueArcLength, linearError, cubicError})
    n++
  }

  return {rows, trueArcLength}
}

// The convergence plot's data for one interpolant: its log-log error points and
// the order the legend reports. Two things keep that order honest:
//   - an error at rounding level (below roundoffFloor) is not plotted. A
//     interpolant that is exact for f (the spline on a straight line) would otherwise scatter noise
//     around 1e-15 and get a meaningless slope; it is reported as exact
//     instead.
//   - the line is fitted to n ≥ maxN/2 only. For small n an interpolant hasn't
//     settled into its asymptotic rate yet, and those points skew the slope.
// Returns {points, fit, order, exact, exactFromN}:
//   points — {x: log10 n, y: log10 error} for every error above the floor
//   fit — VM.numerical.linearRegression over the tail, or null
//   order — -fit.slope, or NaN without a fit
//   exact — true when every finite error is at rounding level
//   exactFromN — the first n from which every error is at rounding level,
//     or null if the last error is still above it
export function convergenceFit(rows, trueArcLength, errorKey) {
  const VM = globalThis.VM
  const roundoffFloor = 1e-12 * Math.max(1, Math.abs(trueArcLength))
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
