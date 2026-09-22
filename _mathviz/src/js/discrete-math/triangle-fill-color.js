/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Shared fill color for a triangle given its (up to 3) vertex colors: a
  // translucent accent2 (purple) for a rainbow (RGB) triangle -- the one
  // thing every Sperner's lemma page cares about, and a hue that contrasts
  // with the amber used elsewhere (e.g. combinatorial-proof's RG
  // triangles) -- and no fill at all otherwise, so the rainbow triangles
  // stay the visual focus. Read from the shared chart palette at call time
  // (VM.plotting.alpha) so it follows a dark-mode toggle. Pages that care
  // about RGB orientation (e.g. the geometric proof) or give some other
  // triangle class its own meaning (e.g. combinatorial-proof's RG
  // "hallway" triangles) should handle those cases themselves and only
  // fall back to this for the rest.
  /**
   * The fill for a small triangle given its vertex color names: a
   * translucent `accent2` (55%) from the live palette when all three
   * colors are distinct (a "rainbow" triangle -- the thing Sperner's lemma
   * is about), and `'none'` otherwise.
   *
   * @param {string[]} colors - The (up to three) vertex color names.
   * @returns {string} An `rgba(...)` color, or the string `'none'`.
   */
  const triangleFillColor = (colors) => {
    const distinct = new Set(colors);
    if (distinct.size === 3) return globalThis.VM.plotting.alpha('accent2', 0.55);
    return 'none';
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, triangleFillColor}}
})(window)
