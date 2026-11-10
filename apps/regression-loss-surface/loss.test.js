/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs the Regression Loss Surface page's math (loss.js) against the
// installed mathviz release, and checks that every example does what its
// title says: the stable rates descend, the "too large" one leaves the
// window, the L1 examples find the L1 minimum.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

loadVM()
const L = await import('./loss.js')

const inside = (win, m, c) => m >= win.m[0] && m <= win.m[1] && c >= win.c[0] && c <= win.c[1]

// Runs `steps` descent steps, stopping early if the iterate leaves the window.
const descend = (points, kind, rate, m, c, win, steps) => {
  const losses = [L.loss(points, m, c, kind)]
  for (let k = 0; k < steps; k++) {
    ({m, c} = L.descentStep(points, m, c, kind, rate))
    if (!inside(win, m, c)) return {left: true, losses, m, c}
    losses.push(L.loss(points, m, c, kind))
  }
  return {left: false, losses, m, c}
}

test('the gradient matches finite differences of the loss', () => {
  const points = L.randomPoints(3)
  for (const kind of L.LOSSES) {
    const [m, c] = [0.37, -1.21]
    const g = L.gradient(points, m, c, kind)
    const h = 1e-6
    const dm = (L.loss(points, m + h, c, kind) - L.loss(points, m - h, c, kind)) / (2 * h)
    const dc = (L.loss(points, m, c + h, kind) - L.loss(points, m, c - h, kind)) / (2 * h)
    assert.ok(Math.abs(g.dm - dm) < 1e-6, `${kind} dm ${g.dm} vs ${dm}`)
    assert.ok(Math.abs(g.dc - dc) < 1e-6, `${kind} dc ${g.dc} vs ${dc}`)
  }
})

test('the least-squares fit is where the L2 gradient vanishes', () => {
  const points = L.randomPoints(11)
  const fit = L.bestFit(points, 'l2')
  const g = L.gradient(points, fit.m, fit.c, 'l2')
  assert.ok(Math.hypot(g.dm, g.dc) < 1e-9)
})

test('l2RateLimit is where descent stops converging', () => {
  const points = L.decodePoints(L.examples[0].params.pts)
  const limit = L.l2RateLimit(points)
  const win = {m: [-1e6, 1e6], c: [-1e6, 1e6]}
  const below = descend(points, 'l2', 0.98 * limit, 0, 0, win, 3000)
  const above = descend(points, 'l2', 1.02 * limit, 0, 0, win, 3000)
  const best = L.loss(points, L.bestFit(points, 'l2').m, L.bestFit(points, 'l2').c, 'l2')
  assert.ok(below.losses.at(-1) - best < 1e-6)
  assert.ok(above.left || above.losses.at(-1) > 1e3)
})

test('no best fit without two distinct x values', () => {
  assert.equal(L.bestFit([{x: 1, y: 0}, {x: 1, y: 2}], 'l2'), null)
})

test('every example sets only page fields, in the order the page needs', () => {
  for (const {title, params} of L.examples) {
    assert.deepEqual(Object.keys(params), ['pts', 'loss', 'rate', 'steps', 'm', 'c'], title)
    assert.ok(L.LOSSES.includes(params.loss), title)
  }
})

test('every example starts inside its window, away from the minimum', () => {
  for (const {title, params} of L.examples) {
    const points = L.decodePoints(params.pts)
    const win = L.lossWindow(points)
    const fit = L.bestFit(points, params.loss)
    assert.ok(inside(win, +params.m, +params.c), `${title}: start outside ${JSON.stringify(win)}`)
    assert.ok(inside(win, fit.m, fit.c), `${title}: best fit outside the window`)
    assert.ok(L.loss(points, +params.m, +params.c, params.loss) > 2 * L.loss(points, fit.m, fit.c, params.loss), title)
  }
})

test('descentPath takes the steps descentStep does, and stops where the run leaves the window', () => {
  const {params} = L.examples[2]
  const points = L.decodePoints(params.pts)
  const win = L.lossWindow(points)
  const run = L.descentPath(points, +params.m, +params.c, 'l2', +params.rate, 500, win)
  assert.ok(run.left)
  assert.ok(run.path.length > 1 && run.path.length < 500)
  for (const p of run.path) assert.ok(inside(win, p.m, p.c))
  assert.deepEqual(run.path[1], L.descentStep(points, +params.m, +params.c, 'l2', +params.rate))
  const calm = L.descentPath(points, 0, 0, 'l2', 0.05, 30, win)
  assert.equal(calm.path.length, 31)
  assert.equal(calm.left, false)
})

test("every example's step count shows what its title says", () => {
  for (const {title, params} of L.examples) {
    const points = L.decodePoints(params.pts)
    const run = L.descentPath(points, +params.m, +params.c, params.loss, +params.rate, +params.steps, L.lossWindow(points))
    assert.equal(run.left, title.startsWith('Step too large'), title)
  }
})

test('the stable L2 examples descend at every step and reach the minimum', () => {
  for (const index of [0, 1, 4]) {
    const {title, params} = L.examples[index]
    const points = L.decodePoints(params.pts)
    const win = L.lossWindow(points)
    assert.ok(+params.rate < L.l2RateLimit(points), title)
    const run = descend(points, 'l2', +params.rate, +params.m, +params.c, win, 200)
    assert.ok(!run.left, title)
    for (let k = 1; k < run.losses.length; k++) assert.ok(run.losses[k] <= run.losses[k - 1] + 1e-12, `${title}: step ${k} went up`)
    const fit = L.bestFit(points, 'l2')
    assert.ok(run.losses.at(-1) - L.loss(points, fit.m, fit.c, 'l2') < 1e-4, title)
  }
})

test('"Large step: zigzag" overshoots: the slope swings past the fit and back', () => {
  const {params} = L.examples[1]
  const points = L.decodePoints(params.pts)
  const fit = L.bestFit(points, 'l2')
  let {m, c} = {m: +params.m, c: +params.c}
  let flips = 0
  let side = Math.sign(m - fit.m)
  for (let k = 0; k < 30; k++) {
    ({m, c} = L.descentStep(points, m, c, 'l2', +params.rate))
    if (Math.sign(m - fit.m) !== side) { flips += 1; side = -side }
  }
  assert.ok(flips >= 10, `only ${flips} sign changes`)
})

test('"Step too large: divergence" leaves the window', () => {
  const {params} = L.examples[2]
  const points = L.decodePoints(params.pts)
  assert.ok(+params.rate > L.l2RateLimit(points))
  assert.ok(descend(points, 'l2', +params.rate, +params.m, +params.c, L.lossWindow(points), 200).left)
})

test('"Far from x = 0" descends, but 200 steps are not enough to reach the minimum', () => {
  const {params} = L.examples[3]
  const points = L.decodePoints(params.pts)
  assert.ok(+params.rate < L.l2RateLimit(points))
  const run = descend(points, 'l2', +params.rate, +params.m, +params.c, L.lossWindow(points), 200)
  assert.ok(!run.left)
  const fit = L.bestFit(points, 'l2')
  assert.ok(run.losses.at(-1) > 1.1 * L.loss(points, fit.m, fit.c, 'l2'))
})

test('the L1 fit beats the L2 fit on L1 loss, and descent gets close to it', () => {
  for (const index of [5, 6]) {
    const {title, params} = L.examples[index]
    const points = L.decodePoints(params.pts)
    const l1 = L.bestFit(points, 'l1')
    const l2 = L.bestFit(points, 'l2')
    const best = L.loss(points, l1.m, l1.c, 'l1')
    assert.ok(best <= L.loss(points, l2.m, l2.c, 'l1') + 1e-9, title)
    const run = descend(points, 'l1', +params.rate, +params.m, +params.c, L.lossWindow(points), 300)
    assert.ok(!run.left, title)
    assert.ok(Math.min(...run.losses) - best < 0.05, `${title}: ${Math.min(...run.losses)} vs ${best}`)
  }
})

test('"Many best L1 lines": a whole region of lines has the minimum L1 loss', () => {
  const points = L.decodePoints(L.examples[6].params.pts)
  for (const [m, c] of [[0.5, 0], [0.25, 1.5], [0.4, 0.5]]) assert.equal(L.loss(points, m, c, 'l1'), 2)
})

test('the outlier pulls the L2 fit much further than the L1 fit', () => {
  const clean = L.decodePoints(L.examples[0].params.pts)
  const dirty = L.decodePoints(L.examples[4].params.pts)
  const drift = kind => Math.abs(L.bestFit(dirty, kind).m - L.bestFit(clean, kind).m)
  assert.ok(drift('l2') > 3 * drift('l1'))
})

test('points survive the URL round trip, and bad text is refused', () => {
  const points = L.randomPoints(5)
  assert.deepEqual(L.decodePoints(L.encodePoints(points)), points)
  assert.equal(L.decodePoints('1,2'), null)
  assert.equal(L.decodePoints(null), null)
  assert.deepEqual(L.decodePoints('1,2;x,3;100,-100'), [{x: 1, y: 2}, {x: 7, y: -12}])
})

test('random points are reproducible and inside the chart', () => {
  assert.deepEqual(L.randomPoints(42), L.randomPoints(42))
  assert.notDeepEqual(L.randomPoints(42), L.randomPoints(43))
  for (const p of L.randomPoints(42)) {
    assert.ok(p.x >= L.X_RANGE[0] && p.x <= L.X_RANGE[1])
    assert.ok(p.y >= L.Y_RANGE[0] && p.y <= L.Y_RANGE[1])
  }
})

test('the surface grid samples the loss at its own coordinates', () => {
  const points = L.randomPoints(9)
  const win = L.lossWindow(points)
  const grid = L.surfaceGrid(points, 'l1', win, 5)
  assert.deepEqual([grid.ms[0], grid.ms.at(-1), grid.cs[0], grid.cs.at(-1)], [win.m[0], win.m[1], win.c[0], win.c[1]])
  assert.equal(grid.z[3][1], L.loss(points, grid.ms[1], grid.cs[3], 'l1'))
})
