/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Systematic-scan Gibbs sampler for a standard bivariate normal with
   * correlation `rho` (both means 0, both variances 1). Each sweep draws
   * the two full conditionals in turn,
   *
   *   x_t ~ N(rho * y_{t-1}, 1 - rho^2),   then   y_t ~ N(rho * x_t, 1 - rho^2),
   *
   * so the chain moves in axis-parallel steps. The half-step point
   * `(x_t, y_{t-1})` is returned too: joining start, half-step and end of
   * each sweep draws the staircase that shows why a strongly correlated
   * target mixes slowly.
   *
   * @param {Object} args
   * @param {number} args.rho - Correlation, strictly inside `(-1, 1)` (not
   *   validated; at `|rho| = 1` the chain never moves).
   * @param {number} args.n - Number of sweeps.
   * @param {number[]} args.start - `[x0, y0]`.
   * @param {() => number} args.gaussian - Standard-normal generator, e.g.
   *   `VM.sampling.gaussianRandom(VM.sampling.seededRandom(seed))`. Two
   *   draws per sweep, x first.
   * @returns {{x: number[], y: number[], halfX: number[], halfY: number[]}}
   *   Arrays of length `n + 1`, index `0` the start. `(x[t], y[t])` is the
   *   state after sweep `t` and `(halfX[t], halfY[t]) = (x[t], y[t-1])` the
   *   point between its two moves; `halfX[0], halfY[0]` repeat the start.
   */
  const gibbsBivariateNormal = ({rho, n, start, gaussian}) => {
    const sigma = Math.sqrt(1 - rho * rho)
    const x = [start[0]]
    const y = [start[1]]
    const halfX = [start[0]]
    const halfY = [start[1]]

    for (let t = 1; t <= n; t++) {
      const prevY = y[t - 1]
      const newX = rho * prevY + sigma * gaussian()
      const newY = rho * newX + sigma * gaussian()
      halfX.push(newX)
      halfY.push(prevY)
      x.push(newX)
      y.push(newY)
    }

    return {x, y, halfX, halfY}
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, gibbsBivariateNormal}}
})(window)
