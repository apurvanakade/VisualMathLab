/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Single source of truth for how a pair of distinct Sperner colors is
  // drawn, shared by triangle fills (VM.discreteMath.triangleFillColor) and edge
  // coloring: red+green -> warn (amber), green+blue -> accent3 (teal),
  // red+blue -> accent2 (purple) -- three palette hues distinct from the
  // three vertex colors themselves (see VM.discreteMath.vertexColor). Read
  // from the shared chart palette at call time, translucent via
  // VM.plotting.alpha, so an edge drawn after a dark-mode toggle gets the
  // lightened hue rather than a light-mode literal.
  /**
   * The shared display color for a pair of **distinct** Sperner color
   * names, at 80% opacity from the live palette: red+green → `warn`
   * (amber), green+blue → `accent3` (teal), red+blue → `accent2`
   * (purple). Order doesn't matter.
   *
   * @param {string} colorA
   * @param {string} colorB
   * @returns {string|null} An `rgba(...)` color, or `null` when the two
   *   names are equal or the pair isn't one of the three above.
   */
  const pairColor = (colorA, colorB) => {
    if (colorA === colorB) return null;
    const alpha = globalThis.VM.plotting.alpha;
    const pair = new Set([colorA, colorB]);
    if (pair.has('red') && pair.has('green')) return alpha('warn', 0.8);
    if (pair.has('green') && pair.has('blue')) return alpha('accent3', 0.8);
    if (pair.has('red') && pair.has('blue')) return alpha('accent2', 0.8);
    return null;
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, pairColor}}
})(window)
