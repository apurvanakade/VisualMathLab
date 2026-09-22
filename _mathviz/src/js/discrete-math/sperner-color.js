/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Colors a barycentric triple so that the whole labelling satisfies
   * Sperner's condition: the three outer vertices get fixed colors --
   * `(0,0,N)` red, `(N,0,0)` green, `(0,N,0)` blue -- a point on a boundary
   * edge (one coordinate zero) gets one of that edge's two endpoint colors
   * uniformly at random, and an interior point gets any of the three
   * uniformly at random.
   *
   * Uses `Math.random()`, so it is not reproducible; a page that needs a
   * URL-shareable coloring should draw its own randomness from
   * {@link VM.sampling.seededRandom} and apply the same rules.
   *
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @returns {'red'|'green'|'blue'} A color **name** -- the key every
   *   Sperner helper compares against. Draw it through
   *   {@link vertexColor}.
   */
  const spernerColor = (a, b, c) => {
    if (a === 0 && b === 0) return 'red'
    if (b === 0 && c === 0) return 'green'
    if (c === 0 && a === 0) return 'blue'
    if (a === 0) return Math.random() < 0.5 ? 'red' : 'blue'
    if (b === 0) return Math.random() < 0.5 ? 'red' : 'green'
    if (c === 0) return Math.random() < 0.5 ? 'green' : 'blue'
    const r = Math.random()
    if (r < 1 / 3) return 'red'
    if (r < 2 / 3) return 'green'
    return 'blue'
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, spernerColor}}
})(window)
