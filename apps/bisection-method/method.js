/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Bisection Method page's examples, method and convergence fit,
// imported by its OJS cells and by method.test.js, which checks every
// example's fitted slope. Uses VM.numerical.linearRegression from the
// mathviz library.

// examples backs the "Try an example" dropdown near the top controls.
export const examples = [
  {
    title: "Choosing one root among many",
    params: {max: "20", f: "(x - 1)*(x - 2)*(x - 3)", a: "0.3", b: "3.4"}
  },
  {
    title: "Same function, different bracket",
    params: {max: "20", f: "(x - 1)*(x - 2)*(x - 3)", a: "2.4", b: "3.5"}
  },
  {
    title: "Standard guaranteed convergence",
    params: {max: "20", f: "x^3 - x - 2", a: "1", b: "2"}
  },
  {
    title: "Sign change without a valid root",
    params: {max: "20", f: "1/x", a: "-1", b: "1"}
  }
]

// Runs bisection on [a, b] for at most maxIterations steps. Returns rows,
// an array of { n, a, b, m, fa, fb, fm, width }, one entry per iteration;
// empty when the inputs are invalid or f has no sign change on [a, b].
export function bisect(f, a, b, maxIterations) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return []
  if (a > b) { const temp = a; a = b; b = temp }   // ensure a < b

  const fa = f(a)
  const fb = f(b)

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return []

  // Bisection requires a sign change across [a, b].
  // If an endpoint is already a root, return it immediately.
  if (fa === 0) return [{n: 0, a, b, m: a, fa, fb, fm: fa, width: b - a}]
  if (fb === 0) return [{n: 0, a, b, m: b, fa, fb, fm: fb, width: b - a}]
  if (fa * fb > 0) return []   // no sign change — can't bracket a root

  const rows = []
  let curA = a, curB = b, curFa = fa, curFb = fb
  let n = 0
  while (n < maxIterations) {
    const m  = 0.5 * (curA + curB)   // midpoint of the current bracket
    const fm = f(m)
    rows.push({n, a: curA, b: curB, m, fa: curFa, fb: curFb, fm, width: curB - curA})

    if (!Number.isFinite(fm)) return rows

    // If the midpoint is exactly a root, stop.
    // Otherwise the code would keep iterating even though the root was found.
    if (fm === 0) return rows

    // Keep the half that still contains a sign change.
    if (curFa * fm < 0) {
      curB = m
      curFb = fm
    } else {
      curA = m
      curFa = fm
    }
    n++
  }
  return rows
}

// The convergence plot's data: log₁₀|f(mₙ)| against n, and the slope the
// legend reports. Returns {points, exactZeroRows, fit, slope}:
//   points — {n, y: log10|f(mₙ)|} for every finite, nonzero residual
//   exactZeroRows — the rows whose midpoint is an exact root
//   fit — VM.numerical.linearRegression over points (x = n), or null
//   slope — fit.slope, or NaN without a fit
export function convergenceFit(rows) {
  const VM = globalThis.VM
  const points = []
  const exactZeroRows = []

  for (const r of rows) {
    if (!Number.isFinite(r.fm)) continue

    if (r.fm === 0) {
      exactZeroRows.push(r)
    } else {
      points.push({n: r.n, y: Math.log10(Math.abs(r.fm))})
    }
  }

  const regressionPoints = []
  for (const point of points) regressionPoints.push({x: point.n, y: point.y})
  const fit = VM.numerical.linearRegression(regressionPoints)
  let slope = NaN
  if (fit) slope = fit.slope
  return {points, exactZeroRows, fit, slope}
}
