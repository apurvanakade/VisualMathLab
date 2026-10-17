/**
 * Copyright (c) 2026 TODO Your Name. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: TODO Your Name
 */

// TODO: the page's examples, method and convergence fit. index.qmd imports
// them, and method.test.js runs every example through them and checks what
// the convergence plot reports, under `npm test`. Keep this file free of the
// DOM and of OJS: plain functions of plain values (a parsed f is a plain JS
// function), so Node can run it. VM.* is available as globalThis.VM.

// TODO: presets for the "Try an example" dropdown. Every key in `params` must
// appear in exampleFieldSelectors in index.qmd, and a field another field's
// bounds depend on (a "max" before its slider) must come first. The first
// example must equal the page's default inputs.
export const examples = [
  {title: "cos(x), from 1", params: {max: "20", g: "cos(x)", x0: "1"}},
  {title: "sqrt(2 + x), from 0", params: {max: "20", g: "sqrt(2 + x)", x0: "0"}},
  {title: "Slow oscillation: 3*x*(1 - x) from 0.4", params: {max: "20", g: "3*x*(1 - x)", x0: "0.4"}}
]

// TODO: the method. Returns the full iteration history, one object per step.
// Invalid input returns no rows.
export function iterate(g, x0, maxIterations) {
  if (!Number.isFinite(x0)) return []

  const rows = []
  let x = x0
  let i = 0
  while (i < maxIterations) {
    const gx = g(x)
    if (!Number.isFinite(gx)) {
      rows.push({i, x, gx: NaN, error: NaN})
      return rows
    }
    rows.push({i, x, gx, error: Math.abs(gx - x)})
    x = gx
    i++
  }
  return rows
}

// TODO: what the convergence plot shows and the number its legend reports.
// Leave out errors at rounding level (exactly 0 here; otherwise below about
// 1e-12 of the value's size): they sit on a floor and drag a fitted slope.
// Returns {points, fit, slope}: log10 error against n, the least-squares
// line through them (or null) and its slope (or NaN).
export function convergenceFit(rows) {
  const VM = globalThis.VM
  const points = []
  for (const r of rows) {
    if (Number.isFinite(r.error) && r.error > 0) points.push({n: r.i, error: r.error})
  }
  const fitInput = []
  for (const p of points) fitInput.push({x: p.n, y: Math.log10(p.error)})
  const fit = VM.numerical.linearRegression(fitInput)
  let slope = NaN
  if (fit) slope = fit.slope
  return {points, fit, slope}
}
