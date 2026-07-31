/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Least Absolute Deviations (L1) fit of a line y = slope*x + intercept
  // through points = [{x, y}, ...], via Iteratively Reweighted Least
  // Squares (IRLS): starting from the ordinary least-squares (L2) fit,
  // repeatedly re-solve a weighted least-squares problem with weights
  // 1/max(|residual|, epsilon). At convergence this minimizes the sum of
  // absolute residuals rather than their squares, since a weighted squared
  // residual weight*residual^2 = residual^2/|residual| = |residual| once
  // weight = 1/|residual|. This is what makes L1 far less sensitive to a
  // few large outliers than L2: an outlier's residual gets downweighted in
  // proportion to its own size, instead of being squared and dominating
  // the fit.
  //
  // Returns {slope, intercept, xlo, xhi, iterations}, or null if there are
  // fewer than two points or the x-values don't vary (a degenerate fit).
  const l1Regression = (points, opts = {}) => {
    if (points.length < 2) return null

    const maxIterations = opts.maxIterations ?? 100
    const tolerance = opts.tolerance ?? 1e-10
    const epsilon = opts.epsilon ?? 1e-6

    let fit = globalThis.VM.numerical.linearRegression(points)
    if (!fit) return null
    let slope = fit.slope
    let intercept = fit.intercept

    let iterations = 0
    while (iterations < maxIterations) {
      let sw = 0, swx = 0, swy = 0, swxy = 0, swxx = 0
      for (const p of points) {
        const residual = p.y - (slope * p.x + intercept)
        const weight = 1 / Math.max(Math.abs(residual), epsilon)
        sw += weight
        swx += weight * p.x
        swy += weight * p.y
        swxy += weight * p.x * p.y
        swxx += weight * p.x * p.x
      }
      const denom = sw * swxx - swx * swx
      if (denom === 0) break

      const newSlope = (sw * swxy - swx * swy) / denom
      const newIntercept = (swy - newSlope * swx) / sw
      iterations++

      const change = Math.abs(newSlope - slope) + Math.abs(newIntercept - intercept)
      slope = newSlope
      intercept = newIntercept
      if (change < tolerance) break
    }

    return {slope, intercept, xlo: points[0].x, xhi: points[points.length - 1].x, iterations}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, l1Regression}}
})(window)
