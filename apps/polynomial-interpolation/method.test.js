/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the orders its convergence
// plot reports for each interpolant's arc length, within 0.15, plus the
// spline itself.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, interpolantErrors, cubicSpline, splineArcLength, arcLengthErrors, convergenceFit } from './method.js'

const VM = loadVM()

// Expected order per interpolant, keyed by example title. The linear
// interpolant's arc length converges at order 2 and the natural spline's
// at order 4 for a smooth f, except where noted.
const expected = {
  "Sine on one full period": {linear: 2, cubic: 4},
  // Still slightly above 4 at these n.
  "Rational peak": {linear: 2, cubic: 4.25},
  // The corner costs both their order: the error is O(h) once the corner
  // falls inside a subinterval. (For even n it is a node, and the linear
  // interpolant is exact.)
  "Nonsmooth corner": {linear: 1, cubic: 1},
  // f'' ≠ 0 at the ends, but the natural spline forces S'' = 0 there: the
  // slope is off by O(h²) over the last O(h) of each end, so the arc length
  // converges at order 3.
  "Cubic polynomial": {linear: 2, cubic: 3}
}

test('every example has expected orders', () => {
  for (const example of examples) {
    assert.ok(example.title in expected, `no expected orders for "${example.title}"`)
  }
})

for (const example of examples) {
  test(`${example.title}: convergence orders`, () => {
    const p = example.params
    const f = VM.expressions.makeFunction(globalThis.math, p.f)
    assert.ok(f, `could not parse f = ${p.f}`)
    const a = VM.expressions.makeNumber(globalThis.math, p.a)
    const b = VM.expressions.makeNumber(globalThis.math, p.b)
    const { rows, trueArcLength } = arcLengthErrors(f, Math.min(a, b), Math.max(a, b), Number(p.max))
    for (const interpolant of interpolantErrors) {
      const want = expected[example.title][interpolant.name]
      const { order } = convergenceFit(rows, trueArcLength, interpolant.errorKey)
      assert.ok(Math.abs(order - want) <= 0.15, `${interpolant.name}: expected order ≈ ${want}, got ${order}`)
    }
  })
}

test('cubicSpline passes through its nodes and has zero curvature at the ends', () => {
  const xs = [0, 0.4, 1, 1.5, 2.5]
  const ys = [1, -1, 0.5, 2, 0]
  const s = cubicSpline(xs, ys)
  for (let i = 0; i < xs.length; i++) assert.ok(Math.abs(s(xs[i]) - ys[i]) < 1e-12)
  const h = 1e-4
  for (const x of [xs[0] + h, xs[xs.length - 1] - h]) {
    const curvature = (s(x + h) - 2 * s(x) + s(x - h)) / (h * h)
    assert.ok(Math.abs(curvature) < 1e-2, `S'' at ${x} is ${curvature}`)
  }
  assert.equal(cubicSpline([0], [1]), null)
})

test('splineArcLength of a straight line is its length', () => {
  const xs = [0, 1, 3, 4]
  const ys = [1, 3, 7, 9]
  assert.ok(Math.abs(splineArcLength(xs, ys) - Math.hypot(4, 8)) < 1e-12)
})
