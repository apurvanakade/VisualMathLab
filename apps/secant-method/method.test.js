/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page with both methods, as its convergence plot
// does, and checks each order it reports: within 0.15 of the expected
// order, or no fit at all (null).

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, runMethod, convergenceFit } from './method.js'

const VM = loadVM()

// Near a simple root the secant method has order φ ≈ 1.62 and IQI about
// 1.84. Both converge in so few steps that the fit sees mostly the steps
// before the order settles, so IQI's estimate lands above or below 1.84.
const expected = {
  "Simple root: IQI takes fewer steps": {secant: 1.6, iqi: 2.05},
  // The secant run wanders without converging: no order.
  "Secant wanders, IQI converges": {secant: null, iqi: 1.45},
  // IQI diverges: no order.
  "Secant converges, IQI diverges": {secant: 1.6, iqi: null},
  // At a triple root both drop to linear.
  "Triple root: both slow to linear": {secant: 1, iqi: 1}
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
    const x0 = VM.expressions.makeNumber(globalThis.math, p.x0)
    const x1 = VM.expressions.makeNumber(globalThis.math, p.x1)
    const x2 = VM.expressions.makeNumber(globalThis.math, p.x2)
    const runs = {secant: [x0, x1], iqi: [x0, x1, x2]}
    for (const method in runs) {
      const want = expected[example.title][method]
      const order = convergenceFit(runMethod(f, runs[method], Number(p.max)).rows).order
      if (want === null) {
        assert.ok(Number.isNaN(order), `${method}: expected no fit, got order ${order}`)
      } else {
        assert.ok(Math.abs(order - want) <= 0.15, `${method}: expected order ≈ ${want}, got ${order}`)
      }
    }
  })
}
