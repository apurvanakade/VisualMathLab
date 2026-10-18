/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the orders its convergence
// plot reports: a number within 0.15 of the expected order, or "exact".

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, rules, integrate } from './method.js'

const VM = loadVM()

// Expected order per rule (left, midpoint, trapezoidal, simpson), keyed by
// example title.
const expected = {
  "Signed area cancellation": {left: 1, midpoint: 2, trapezoidal: 2, simpson: "exact"},
  "Oscillatory integral": {left: 1, midpoint: 2, trapezoidal: 2, simpson: 4},
  // The corner is at no grid point, so every rule but the left one loses
  // its full order there.
  "Nonsmooth corner": {left: 1, midpoint: 2.3, trapezoidal: 2.2, simpson: 1.6},
  // sqrt(x) has an unbounded derivative at 0: every rule but the left one
  // drops to order 1.5.
  "Square-root singularity": {left: 1, midpoint: 1.5, trapezoidal: 1.5, simpson: 1.5},
  "Rational peak": {left: 1, midpoint: 2, trapezoidal: 2, simpson: 4.15},
  "Sine area on a quarter-period": {left: 1, midpoint: 2, trapezoidal: 2, simpson: 4},
  "Simpson's rule needs even n": {left: 1, midpoint: 2, trapezoidal: 2, simpson: 4}
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
    const a = VM.expressions.makeNumber(globalThis.math, p.a)
    const b = VM.expressions.makeNumber(globalThis.math, p.b)
    assert.ok(f, `could not parse f = ${p.f}`)
    const { rows, trueIntegral } = integrate(f, Math.min(a, b), Math.max(a, b), Number(p.max))
    for (const rule of rules) {
      const want = expected[example.title][rule.name]
      const fit = VM.numerical.orderFromErrorsVsN(rows, trueIntegral, rule.errorKey)
      if (want === "exact") {
        assert.ok(fit.exact, `${rule.name}: expected exact, got order ${fit.order}`)
      } else {
        assert.ok(Math.abs(fit.order - want) <= 0.15, `${rule.name}: expected order ≈ ${want}, got ${fit.order}`)
      }
    }
  })
}
