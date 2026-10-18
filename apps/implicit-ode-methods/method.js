/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The Implicit ODE Methods page's examples, methods and convergence fit,
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
// Each max is large enough for both methods to reach order 1 in the
// convergence plot, which fits n ≥ max/2 (method.test.js checks it). A
// stiff equation needs n well past λ²b/2 for that, so the stiff example
// runs on a short interval, opening at n = 3, where explicit Euler's step
// factor 1 − 15h is −1.5 and it blows up while implicit Euler decays.
export const examples = [
  {
    title: "Fast attraction to cos(t)",
    params: {max: "80", f: "-5 * (y - cos(t)) - sin(t)", y0: "0", b: "2", n: "4"}
  },
  {
    title: "Strong damping with forcing",
    params: {max: "40", f: "-4 * y + 4 * sin(t)", y0: "0", b: "3", n: "4"}
  },
  {
    title: "Stiff-looking decay",
    params: {max: "160", f: "-15 * y", y0: "1", b: "0.5", n: "3"}
  },
  {
    title: "Damped sinusoidal forcing",
    params: {max: "40", f: "sin(t) - 2 * y", y0: "0", b: "3", n: "4"}
  },
  {
    title: "Logistic growth",
    params: {max: "40", f: "y * (1 - y)", y0: "0.1", b: "8", n: "4"}
  },
  {
    title: "Nonlinear Riccati-type equation",
    params: {max: "80", f: "y^2 - t", y0: "0", b: "2", n: "4"}
  }
]

// The two methods, in legend order: the key of each one's error in a row
// of endpointErrors' rows, and its name.
export const methodErrors = [
  {errorKey: "eulerError", name: "Euler"},
  {errorKey: "implicitEulerError", name: "Implicit Euler"}
]

// partialY(f, t, y) numerically estimates ∂f/∂y(t, y) via a central
// difference, used by the Newton solve inside implicitEulerSolve.
export function partialY(f, t, y) {
  const eps = 1e-6 * Math.max(1, Math.abs(y))
  return (f(t, y + eps) - f(t, y - eps)) / (2 * eps)
}

// implicitEulerSolve(f, t0, y0, tEnd, n) advances y' = f(t, y), y(t0) = y0
// with n steps of implicit (backward) Euler: y_{i+1} = y_i + h f(t_{i+1}, y_{i+1}).
// Each step solves this root-finding problem for y_{i+1} with a few
// iterations of Newton's method, starting from the explicit Euler step as
// the initial guess. Returns the full trajectory {ts, ys}.
export function implicitEulerSolve(f, t0, y0, tEnd, n) {
  const h = (tEnd - t0) / n
  const ts = [t0]
  const ys = [y0]
  let t = t0, y = y0
  for (let i = 0; i < n; i++) {
    const tNext = t0 + (i + 1) * h

    // Newton's method for g(z) = z - y - h f(tNext, z) = 0.
    let z = y + h * f(t, y)   // explicit Euler step as the initial guess
    for (let k = 0; k < 8; k++) {
      const g = z - y - h * f(tNext, z)
      const dg = 1 - h * partialY(f, tNext, z)
      // A near-zero denominator (h * ∂f/∂y ≈ 1) makes the correction g/dg
      // blow up — bail out and keep the current z rather than let a tiny,
      // noisy dg (from the numerical derivative) amplify into a huge,
      // wrong jump. 1e-8 is well above that noise floor.
      if (Math.abs(dg) < 1e-8) break
      const step = g / dg
      if (!Number.isFinite(step) || Math.abs(step) > 1e6 * Math.max(1, Math.abs(z))) break
      z = z - step
    }

    y = z
    t = tNext
    ts.push(t)
    ys.push(y)
  }
  return {ts, ys}
}

// Solves y' = f(t, y), y(0) = y0 up to t = b with both methods, for each
// step count n = 1..maxN.
//   rows — array of { n, eulerValue, implicitEulerValue, trueValue,
//     eulerError, implicitEulerError }, one entry per n — the computed y(b)
//     for each method against a reference value.
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
    const implicitEulerValue = implicitEulerSolve(f, t0, y0, b, n).ys[n]

    const eulerError = Math.abs(eulerValue - trueValue)
    const implicitEulerError = Math.abs(implicitEulerValue - trueValue)

    rows.push({n, eulerValue, implicitEulerValue, trueValue, eulerError, implicitEulerError})
    n++
  }

  return {rows, trueValue}
}
