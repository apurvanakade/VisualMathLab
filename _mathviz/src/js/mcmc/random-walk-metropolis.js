/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Random-walk Metropolis: from `x`, propose `y = x + step`, with the step
   * drawn from a symmetric distribution, and accept with probability
   * `min(1, pi(y) / pi(x))`. Symmetric proposals need no Hastings
   * correction. Two step distributions:
   *
   * - `"uniform"`: each coordinate `U(-scale, scale)`, i.e. uniform on the
   *   box of side `2 * scale` centered at `x`;
   * - `"gaussian"`: each coordinate `N(0, scale^2)`.
   *
   * The target is given as a log density up to an additive constant, so a
   * uniform target on a region is `0` inside and `-Infinity` outside, and
   * proposals outside are always rejected -- the "random walk in a region"
   * sampler.
   *
   * Randomness is consumed in a fixed order -- the proposal's coordinates,
   * then one uniform for the accept test, every step -- so a seeded `rng`
   * reproduces the same chain, and two runs that differ only in `scale`
   * share their underlying draws.
   *
   * @param {Object} args
   * @param {(x: number[]) => number} args.logDensity - Log target density,
   *   up to a constant.
   * @param {number[]} args.start - Initial state; its length sets the
   *   dimension. A one-dimensional chain uses `[x0]`.
   * @param {number} args.n - Number of states returned, including `start`.
   * @param {number} args.scale - Proposal half-width (`"uniform"`) or
   *   standard deviation (`"gaussian"`).
   * @param {() => number} args.rng - Uniform `[0, 1)` generator, e.g.
   *   `VM.sampling.seededRandom(seed)`.
   * @param {string} [args.proposal="uniform"] - `"uniform"` or `"gaussian"`.
   * @returns {{samples: number[][], proposals: (number[]|null)[],
   *   accepted: boolean[], acceptedCount: number}} Arrays of length `n`,
   *   indexed by step: `samples[t]` is the state after step `t`,
   *   `proposals[t]` the point proposed at step `t` and `accepted[t]`
   *   whether it was taken. Index `0` is the start: `proposals[0]` is
   *   `null` and `accepted[0]` is `true`. `acceptedCount` counts steps
   *   `1..n-1` only.
   */
  const randomWalkMetropolis = ({logDensity, start, n, scale, rng, proposal = "uniform"}) => {
    const dim = start.length
    const samples = [start.slice()]
    const proposals = [null]
    const accepted = [true]
    let acceptedCount = 0

    // One standard-normal draw from two uniforms (Box-Muller), inlined
    // rather than VM.sampling.gaussianRandom so both proposals draw from
    // the same `rng` in a documented order.
    const standardNormal = () => {
      const u1 = Math.max(rng(), 1e-12)
      const u2 = rng()
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    }

    let current = start.slice()
    let currentLog = logDensity(current)

    for (let t = 1; t < n; t++) {
      const y = []
      for (let j = 0; j < dim; j++) {
        if (proposal === "gaussian") {
          y.push(current[j] + scale * standardNormal())
        } else {
          y.push(current[j] + scale * (2 * rng() - 1))
        }
      }
      const proposalLog = logDensity(y)
      const u = rng()

      // A start outside the support (log density -Infinity) accepts the
      // first proposal that lands inside it; -Infinity - -Infinity is NaN,
      // which would otherwise reject forever.
      let accept = false
      if (proposalLog === -Infinity) {
        accept = false
      } else if (currentLog === -Infinity) {
        accept = true
      } else {
        accept = Math.log(u) < proposalLog - currentLog
      }

      proposals.push(y)
      accepted.push(accept)
      if (accept) {
        current = y
        currentLog = proposalLog
        acceptedCount++
      }
      samples.push(current.slice())
    }

    return {samples, proposals, accepted, acceptedCount}
  }

  globalThis.VM = {...globalThis.VM, mcmc: {...globalThis.VM?.mcmc, randomWalkMetropolis}}
})(window)
