/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Builds a natural cubic spline through the points (xs[i], ys[i]) and
  // returns a JS function (x => number) that evaluates it. xs must be sorted
  // ascending. Returns null if there are fewer than two points.
  //
  // Standard tridiagonal (Thomas algorithm) solve for the second-derivative
  // coefficients, with natural boundary conditions (zero second derivative
  // at both endpoints).
  const cubicSpline = (xs, ys) => {
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

    return x => {
      let i = n - 1
      if (x <= xs[0]) {
        i = 0
      } else if (x >= xs[n]) {
        i = n - 1
      } else {
        for (let k = 0; k < n; k++) {
          if (x >= xs[k] && x <= xs[k + 1]) { i = k; break }
        }
      }
      const dx = x - xs[i]
      return ys[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx
    }
  }

  globalThis.VM = {...globalThis.VM, cubicSpline}
})(window)
