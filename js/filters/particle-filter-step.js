/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Constant-velocity 2D bootstrap particle filter, one predict+update+
  // resample step. Each particle is a plain object
  // {x, y, vx, vy, weight}; unlike kalman2DStep's single Gaussian belief
  // (a mean + covariance), the filter's belief here is the whole particle
  // cloud, so it naturally represents non-Gaussian and multi-modal
  // uncertainty even though the constant-velocity motion model used below
  // is the same one kalman2DStep assumes.
  //
  // rng supplies the two random streams the filter consumes:
  // rng.gaussian() draws a standard normal (used per particle, per axis,
  // for the process-noise/predict step) and rng.uniform() draws one
  // uniform sample in [0, 1) (used once per call, for systematic
  // resampling). Callers typically build both from the same seeded
  // source, e.g. `const u = VM.sampling.seededRandom(seed); const rng =
  // {uniform: u, gaussian: VM.sampling.gaussianRandom(u)}`.
  //
  // R is the assumed measurement-noise variance (applied identically on
  // both axes, so a particle's likelihood only depends on its distance to
  // the measurement) and Q the assumed process-noise intensity (variance
  // of the random acceleration added to each particle's velocity every
  // step) -- the same roles R and Q play in the 2D Kalman filter, which
  // is what makes the two apps directly comparable side by side.
  const particleFilterStep = (rng, prevParticles, z, opts) => {
    const R = opts.R
    const Q = opts.Q
    const n = prevParticles.length
    const sqrtQ = Math.sqrt(Q)
    const twoR = 2 * R

    // Predict: random-walk the velocity by a Gaussian acceleration draw,
    // then advance position by the (already-updated) velocity -- one
    // discrete step, matching kalman2DStep's dt = 1 convention.
    const predicted = new Array(n)
    for (let i = 0; i < n; i++) {
      const p = prevParticles[i]
      const vx = p.vx + rng.gaussian() * sqrtQ
      const vy = p.vy + rng.gaussian() * sqrtQ
      const x = p.x + vx
      const y = p.y + vy
      predicted[i] = {x, y, vx, vy, weight: p.weight}
    }

    // Update: reweight each particle by the Gaussian likelihood of the
    // measurement given its predicted position. The tiny additive
    // constant keeps every weight strictly positive even when every
    // particle lands far from z (e.g. right after a stroke restarts),
    // so weightSum is never zero.
    let weightSum = 0
    for (let i = 0; i < n; i++) {
      const p = predicted[i]
      const dx = p.x - z[0]
      const dy = p.y - z[1]
      p.weight = p.weight * Math.exp(-(dx * dx + dy * dy) / twoR) + 1e-300
      weightSum += p.weight
    }
    for (let i = 0; i < n; i++) predicted[i].weight /= weightSum

    // Estimate: the weighted mean position, read off before resampling
    // collapses the weights back to uniform -- this is the filter's
    // single-point output, analogous to kalman2DStep's x[0]/x[1].
    let ex = 0
    let ey = 0
    for (let i = 0; i < n; i++) {
      ex += predicted[i].x * predicted[i].weight
      ey += predicted[i].y * predicted[i].weight
    }

    // Resample: systematic resampling, one uniform draw for the whole
    // set (rather than n independent draws) -- the standard low-variance
    // resampling scheme, and it keeps the filter's randomness usage to
    // exactly one uniform() call per step regardless of particle count.
    const resampled = new Array(n)
    const step = 1 / n
    const start = rng.uniform() * step
    let cumulative = predicted[0].weight
    let j = 0
    for (let i = 0; i < n; i++) {
      const target = start + i * step
      while (cumulative < target && j < n - 1) {
        j++
        cumulative += predicted[j].weight
      }
      const src = predicted[j]
      resampled[i] = {x: src.x, y: src.y, vx: src.vx, vy: src.vy, weight: step}
    }

    return {particles: resampled, estimate: {x: ex, y: ey}}
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, particleFilterStep}}
})(window)
