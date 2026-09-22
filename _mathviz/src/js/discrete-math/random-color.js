/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Picks one of the three Sperner color names uniformly at random,
   * ignoring position -- for demonstrating what happens when the boundary
   * condition {@link spernerColor} enforces is violated.
   *
   * @returns {'red'|'green'|'blue'}
   */
  const randomColor = () => {
    const r = Math.random()
    if (r < 1 / 3) return 'red'
    if (r < 2 / 3) return 'green'
    return 'blue'
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, randomColor}}
})(window)
