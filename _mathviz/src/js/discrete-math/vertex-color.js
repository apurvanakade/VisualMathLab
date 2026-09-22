/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The display color for a Sperner vertex color NAME. Every Sperner's
  // lemma page (and VM.discreteMath.spernerColor / randomColor) works in
  // the names 'red' / 'green' / 'blue' -- they are the keys the logic
  // compares -- but a CSS named color is not a site palette color, and
  // `fill: "red"` stays the same saturated red after a dark-mode toggle.
  // This maps each name onto the shared chart palette
  // (js/plotting/chart-theme.js), read at CALL time so a cell that re-runs
  // on a theme toggle repaints: red -> alt, green -> ok, blue -> fn. The
  // prose swatches in swatch.css (.vm-swatch-alt / -ok / -fn) use the
  // same three tokens, so a swatch and a dot agree. (Not -accent: that is
  // the UI accent token, which only happens to equal --vm-color-fn in the
  // default palette.)
  /**
   * The display color for a Sperner color **name**, read from the live
   * chart palette at call time: `'red'` → `colors().alt`, `'green'` →
   * `colors().ok`, `'blue'` → `colors().fn`. Use it at the moment of
   * drawing -- `fill: d => VM.discreteMath.vertexColor(d.color)` -- never
   * `fill: "red"`, which is not the site's red and doesn't lighten in dark
   * mode.
   *
   * @param {string} name - `'red'`, `'green'` or `'blue'`.
   * @returns {string|null} A CSS color, or `null` for any other name.
   */
  const vertexColor = (name) => {
    const colors = globalThis.VM.plotting.colors();
    if (name === 'red') return colors.alt;
    if (name === 'green') return colors.ok;
    if (name === 'blue') return colors.fn;
    return null;
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, vertexColor}}
})(window)
