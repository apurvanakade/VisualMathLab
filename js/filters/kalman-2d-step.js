/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Constant-velocity 2D Kalman filter, one predict+update step. State
  // x = [x, y, vx, vy] (a plain 4-element array) evolves under the
  // constant-velocity transition F for one discrete step (dt = 1, one
  // step per generated sample -- there's no wall-clock time in the model
  // itself). H maps state to the observed [x, y] position; Q is the 4x4
  // process-noise covariance and R the 2x2 measurement-noise covariance,
  // both plain nested-array matrices. Matrix algebra is done with mathjs
  // (passed in, matching VM.expressions' convention of taking mathjs as a
  // parameter rather than assuming a global) -- passing plain arrays
  // rather than `mathjs.matrix(...)`/`mathjs.identity(...)` keeps every
  // intermediate result a plain array too, so callers can index into the
  // returned state (`x[0]`, `x[1]`, ...) directly.
  const F = [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ]
  const H = [
    [1, 0, 0, 0],
    [0, 1, 0, 0]
  ]
  const Ht = [
    [1, 0],
    [0, 1],
    [0, 0],
    [0, 0]
  ]
  const I4 = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ]

  const kalman2DStep = (mathjs, prev, z, opts) => {
    const Q = opts.Q
    const R = opts.R

    const xPred = mathjs.multiply(F, prev.x)
    const pPred = mathjs.add(mathjs.multiply(mathjs.multiply(F, prev.P), mathjs.transpose(F)), Q)

    const S = mathjs.add(mathjs.multiply(mathjs.multiply(H, pPred), Ht), R)
    const K = mathjs.multiply(mathjs.multiply(pPred, Ht), mathjs.inv(S))

    const innovation = mathjs.subtract(z, mathjs.multiply(H, xPred))
    const x = mathjs.add(xPred, mathjs.multiply(K, innovation))
    const P = mathjs.multiply(mathjs.subtract(I4, mathjs.multiply(K, H)), pPred)

    return {x, P, K}
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, kalman2DStep}}
})(window)
