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
  // prose swatches in styles.css (.vm-swatch-alt / -ok / -accent) use the
  // same three tokens, so a swatch and a dot agree. Returns null for
  // anything that isn't one of the three names.
  const vertexColor = (name) => {
    const colors = globalThis.VM.plotting.colors();
    if (name === 'red') return colors.alt;
    if (name === 'green') return colors.ok;
    if (name === 'blue') return colors.fn;
    return null;
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, vertexColor}}
})(window)
