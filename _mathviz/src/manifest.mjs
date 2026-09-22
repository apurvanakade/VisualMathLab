/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The single source of load order for the library. scripts/build.mjs
// concatenates these files, in this order, into dist/mathviz.js and
// dist/mathviz.css; scripts/load-vm.mjs evaluates the same list, in the same
// order, for the unit tests. Every file under src/js/ (tests excepted) must
// appear here exactly once -- src/manifest.test.js enforces that, along with
// the ordering constraints in `mustPrecede` below.

export const js = [
  'expressions/make-function.js',
  'expressions/make-derivative.js',
  'expressions/make-number.js',
  'expressions/make-rational.js',
  'expressions/make-ode-function.js',
  'expressions/make-function-of-t.js',
  'expressions/noop.js',
  'plotting/padded-range.js',
  'plotting/chart-theme.js',
  'plotting/plotly-fullscreen-button.js',
  'plotting/svg-fullscreen-button.js',
  'numerical/linear-regression.js',
  'numerical/l1-regression.js',
  'numerical/polynomial-fit.js',
  'numerical/euler-solve.js',
  'numerical/rk4-solve.js',
  'numerical/simpson-estimate.js',
  'numerical/lagrange-quadratic.js',
  'sampling/seeded-random.js',
  'sampling/gaussian-random.js',
  'distributions/log-gamma.js',
  'distributions/sample-curve.js',
  'distributions/histogram-bins.js',
  'distributions/bernoulli-pmf.js',
  'distributions/binomial-pmf.js',
  'distributions/poisson-pmf.js',
  'distributions/geometric-pmf.js',
  'distributions/exponential-pdf.js',
  'distributions/normal-pdf.js',
  'distributions/gamma-pdf.js',
  'distributions/chi-squared-pdf.js',
  'distributions/beta-pdf.js',
  'distributions/student-t-pdf.js',
  'distributions/f-pdf.js',
  'distributions/negative-binomial-pmf.js',
  'distributions/hypergeometric-pmf.js',
  'distributions/lognormal-pdf.js',
  'distributions/cauchy-pdf.js',
  'distributions/weibull-pdf.js',
  'filters/moving-average-filter.js',
  'filters/ema-filter.js',
  'filters/kalman-1d-filter.js',
  'ui/render-table.js',
  'ui/range-progress.js',
  'ui/slider-play.js',
  'ui/apply-example.js',
  'ui/legend-overlay.js',
  'ui/draggable-overlay.js',
  'discrete-math/barycentric-triples.js',
  'discrete-math/sub-triangles.js',
  'discrete-math/triangulation-edges.js',
  'discrete-math/sperner-color.js',
  'discrete-math/random-color.js',
  'discrete-math/vertex-color.js',
  'discrete-math/mixed-pair-color.js',
  'discrete-math/triangle-fill-color.js',
]

// tokens.css first: it declares the --vm-* defaults everything after it reads.
export const css = [
  'tokens.css',
  'panel.css',
  'chart-block.css',
  'swatch.css',
  'legend-controls.css',
  'modebar.css',
  'sliders.css',
  'table.css',
]

// [before, after] pairs -- `after` may be a string or a RegExp matched against
// every entry. These are the real load-time dependencies between files (one
// file reads a VM.* function another one defines while it is still loading, or
// at call time from a module that must already exist).
export const mustPrecede = [
  // Every factorial/Beta normalizing constant goes through logGamma.
  ['distributions/log-gamma.js', /^distributions\/.*-(pmf|pdf)\.js$/],
  ['distributions/gamma-pdf.js', 'distributions/chi-squared-pdf.js'],
  // plotly-fullscreen-button reads VM.plotting.layout/config/themePatch;
  // the discrete-math color helpers read VM.plotting.colors/alpha.
  ['plotting/chart-theme.js', 'plotting/plotly-fullscreen-button.js'],
  ['plotting/chart-theme.js', /^discrete-math\/(vertex|mixed-pair|triangle-fill)-color\.js$/],
  // svg-fullscreen-button reuses VM.plotting.fullscreenButton.icon.
  ['plotting/plotly-fullscreen-button.js', 'plotting/svg-fullscreen-button.js'],
  ['discrete-math/sub-triangles.js', 'discrete-math/triangulation-edges.js'],
  ['numerical/linear-regression.js', 'numerical/l1-regression.js'],
]
