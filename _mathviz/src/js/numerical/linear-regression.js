/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Ordinary least-squares fit of a line `y = slope*x + intercept`. Every
   * convergence-order plot uses this on `(log h, log error)` pairs, where
   * the slope is the observed order.
   *
   * @param {{x: number, y: number}[]} points - The data, in the order the
   *   fitted segment should be drawn.
   * @returns {{slope: number, intercept: number, xlo: number, xhi: number}|null}
   *   The fit, or `null` if there are fewer than two points or the
   *   x-values don't vary (a vertical, degenerate fit). `xlo`/`xhi` are the
   *   **first and last** point's `x` -- not the min and max -- so the
   *   segment they describe covers the data only when `points` is sorted.
   */
  const linearRegression = points => {
    if (points.length < 2) return null

    const pointCount = points.length
    let sx = 0, sy = 0, sxy = 0, sxx = 0
    for (const p of points) {
      sx += p.x
      sy += p.y
      sxy += p.x * p.y
      sxx += p.x * p.x
    }
    const denom = pointCount * sxx - sx * sx
    if (denom === 0) return null

    const slope = (pointCount * sxy - sx * sy) / denom
    const intercept = (sy - slope * sx) / pointCount
    return {slope, intercept, xlo: points[0].x, xhi: points[pointCount - 1].x}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, linearRegression}}
})(window)
