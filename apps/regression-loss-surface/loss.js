/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The math behind the Regression Loss Surface page: the two losses as
// functions of (m, c), their gradients, a gradient-descent step, the window
// of (m, c) the sliders and the surface cover, and the example data. Pure
// functions of plain numbers, with no DOM and no OJS, so loss.test.js runs
// them under Node. The library is read as globalThis.VM at call time.

// The points chart's axes, fixed so that neither a slider nor a dragged
// point rescales them; points are kept inside them.
export const X_RANGE = [-5, 7]
export const Y_RANGE = [-12, 12]

export const LOSSES = ["l2", "l1"]

const residual = (p, m, c) => p.y - (m * p.x + c)

/**
 * The mean loss of the line y = mx + c over the points: mean squared
 * residual for "l2", mean absolute residual for "l1". NaN with no points.
 */
export function loss (points, m, c, kind) {
  let total = 0
  for (const p of points) {
    const r = residual(p, m, c)
    if (kind === "l1") total += Math.abs(r)
    else total += r * r
  }
  return total / points.length
}

/**
 * The gradient of `loss` in (m, c). For "l1" it is the subgradient that
 * takes sign(0) = 0, which is what a descent step can use at a kink.
 */
export function gradient (points, m, c, kind) {
  let dm = 0
  let dc = 0
  for (const p of points) {
    const r = residual(p, m, c)
    let w = -2 * r
    if (kind === "l1") w = -Math.sign(r)
    dm += w * p.x
    dc += w
  }
  return {dm: dm / points.length, dc: dc / points.length}
}

/** One gradient-descent step of size `rate` from (m, c). */
export function descentStep (points, m, c, kind, rate) {
  const g = gradient(points, m, c, kind)
  return {m: m - rate * g.dm, c: c - rate * g.dc}
}

const inWindow = (win, p) => p.m >= win.m[0] && p.m <= win.m[1] && p.c >= win.c[0] && p.c <= win.c[1]

/**
 * Up to `steps` gradient-descent steps from (m, c): the iterates, the start
 * first. It ends early, with `left` true, at the first step that would land
 * outside the window (a diverging run), so every iterate is one the charts
 * can draw.
 */
export function descentPath (points, m, c, kind, rate, steps, win) {
  const path = [{m, c}]
  for (let k = 0; k < steps; k++) {
    const next = descentStep(points, path.at(-1).m, path.at(-1).c, kind, rate)
    if (!Number.isFinite(next.m) || !Number.isFinite(next.c) || !inWindow(win, next)) return {path, left: true}
    path.push(next)
  }
  return {path, left: false}
}

/**
 * The (m, c) that minimizes the loss: least squares in closed form for
 * "l2", iteratively reweighted least squares for "l1" (one of the
 * minimizers when there are many). Null when the points don't determine a
 * line (fewer than two distinct x values).
 */
export function bestFit (points, kind) {
  const VM = globalThis.VM
  let fit = VM.numerical.linearRegression(points)
  if (kind === "l1" && fit) fit = VM.numerical.l1Regression(points)
  if (!fit) return null
  return {m: fit.slope, c: fit.intercept}
}

/**
 * The largest learning rate for which gradient descent on the mean squared
 * error converges from every start: 2 / (the Hessian's largest eigenvalue).
 * The Hessian is constant, 2 [[mean x^2, mean x], [mean x, 1]], which is
 * why L2's rule is one number; L1 has no such bound.
 */
export function l2RateLimit (points) {
  let sx = 0
  let sxx = 0
  for (const p of points) {
    sx += p.x
    sxx += p.x * p.x
  }
  const a = sxx / points.length
  const b = sx / points.length
  const half = (a + 1) / 2
  const lambda = 2 * (half + Math.sqrt(half * half - (a - b * b)))
  return 2 / lambda
}

const roundTo = (value, step) => Math.round(value / step) * step
const tidy = (value) => Number(value.toFixed(2))

/**
 * The (m, c) rectangle the sliders and the surface cover: centered on the
 * least-squares fit (the same for both losses, so switching loss doesn't
 * move the axes), 2.5 either side in m and, in c, 2.5 times the root mean
 * square of x. That ratio makes the edges of the window cost about the
 * same in either direction, so the bowl fills the view.
 */
export function lossWindow (points) {
  const fit = bestFit(points, "l2") ?? {m: 0, c: 0}
  let sxx = 0
  for (const p of points) sxx += p.x * p.x
  const rms = Math.sqrt(sxx / Math.max(points.length, 1))
  const mHalf = 2.5
  const cHalf = Math.max(2.5, roundTo(2.5 * rms, 0.5))
  const m0 = roundTo(fit.m, 0.1)
  const c0 = roundTo(fit.c, 0.1)
  return {m: [tidy(m0 - mHalf), tidy(m0 + mHalf)], c: [tidy(c0 - cHalf), tidy(c0 + cHalf)]}
}

/**
 * The loss sampled on a steps x steps grid over the window, as Plotly's
 * surface wants it: z[i][j] is the loss at (ms[j], cs[i]).
 */
export function surfaceGrid (points, kind, win, steps = 61) {
  const ms = []
  const cs = []
  // The last sample is the window's edge exactly, not lo + (hi - lo),
  // which can round past it.
  const along = ([lo, hi], k) => k === steps - 1 ? hi : lo + (hi - lo) * k / (steps - 1)
  for (let k = 0; k < steps; k++) {
    ms.push(along(win.m, k))
    cs.push(along(win.c, k))
  }
  const z = []
  for (const c of cs) {
    const row = []
    for (const m of ms) row.push(loss(points, m, c, kind))
    z.push(row)
  }
  return {ms, cs, z}
}

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

/**
 * A fresh random data set: `n` points scattered about a random line, x
 * spread over [-4, 6] (off center, so slope and intercept trade off and the
 * bowl is tilted), rounded to two decimals so the URL that carries them
 * stays short. The same seed gives the same points.
 */
export function randomPoints (seed, n = 16) {
  const VM = globalThis.VM
  const rng = VM.sampling.seededRandom(seed)
  const gaussian = VM.sampling.gaussianRandom(rng)
  let sign = 1
  if (rng() < 0.5) sign = -1
  const slope = sign * (0.3 + rng() * 1.2)
  const intercept = -3 + rng() * 6
  const points = []
  for (let i = 0; i < n; i++) {
    const x = -4 + 10 * (i + rng()) / n
    const y = slope * x + intercept + 1.5 * gaussian()
    points.push({x: tidy(x), y: tidy(clamp(y, Y_RANGE[0], Y_RANGE[1]))})
  }
  return points
}

/** Points as the URL carries them: "x,y;x,y;...", two decimals. */
export function encodePoints (points) {
  return points.map(p => `${tidy(p.x)},${tidy(p.y)}`).join(";")
}

/**
 * The inverse of encodePoints. Pairs that aren't two finite numbers are
 * dropped and the rest are kept inside the chart's axes; null when fewer
 * than two points are left.
 */
export function decodePoints (text) {
  if (typeof text !== "string") return null
  const points = []
  for (const pair of text.split(";")) {
    const [x, y] = pair.split(",").map(Number)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    points.push({x: clamp(x, X_RANGE[0], X_RANGE[1]), y: clamp(y, Y_RANGE[0], Y_RANGE[1])})
  }
  if (points.length < 2) return null
  return points
}

// Example data, written out rather than drawn from a seed so an example
// never changes under a library update.
const NOISY = "-3.73,-2.4;-3.32,-0.85;-2.4,-0.5;-1.83,-0.39;-1.03,-0.23;-0.75,1.69;0.08,0.71;0.66,0.69;1.25,2.91;1.69,3.03;2.4,2.26;3.13,4.74;3.75,5.05;4.33,4.66;4.86,4.47;5.67,6.46"
const OUTLIER = "-3.73,-2.4;-3.32,-0.85;-2.4,-0.5;-1.83,-0.39;-1.03,-0.23;-0.75,1.69;0.08,0.71;0.66,0.69;1.25,2.91;1.69,3.03;2.4,2.26;3.13,4.74;3.75,5.05;4.33,4.66;4.86,-9.5;5.67,6.46"
const FAR = "3.1,1.42;3.3,2.18;3.5,1.85;3.7,2.66;3.9,2.4;4.1,3.12;4.3,2.71;4.5,3.38;4.7,3.47;4.9,3.21;5.1,4.06;5.3,3.83;5.5,4.47;5.7,4.18;5.9,4.92;6.1,4.6"
const FLAT = "-3,-2;-3,2;5,1;5,5"

/**
 * The "Try an example" presets. Every key is a page field; pts comes first,
 * because the m and c sliders' bounds follow the points, and steps before k,
 * because it bounds the step slider. Each opens at step 0, for the play
 * button to run.
 */
export const examples = [
  {title: "Noisy line: least squares", params: {pts: NOISY, loss: "l2", rate: "0.05", steps: "60", m: "-0.8", c: "5", k: "0"}},
  {title: "Large step: zigzag", params: {pts: NOISY, loss: "l2", rate: "0.1", steps: "60", m: "-0.8", c: "5", k: "0"}},
  {title: "Step too large: divergence", params: {pts: NOISY, loss: "l2", rate: "0.115", steps: "60", m: "1.4", c: "0.5", k: "0"}},
  {title: "Far from x = 0: a narrow valley", params: {pts: FAR, loss: "l2", rate: "0.04", steps: "200", m: "2.5", c: "-3", k: "0"}},
  {title: "An outlier, least squares", params: {pts: OUTLIER, loss: "l2", rate: "0.05", steps: "100", m: "-1", c: "5", k: "0"}},
  {title: "An outlier, least absolute deviations", params: {pts: OUTLIER, loss: "l1", rate: "0.05", steps: "300", m: "-1", c: "5", k: "0"}},
  {title: "Many best L1 lines", params: {pts: FLAT, loss: "l1", rate: "0.05", steps: "200", m: "-1", c: "-2", k: "0"}}
]
