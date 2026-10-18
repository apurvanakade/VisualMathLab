/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the order its convergence plot
// reports: within 0.15 of the expected order, or no fit at all (null).

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, newton } from './method.js'

const VM = loadVM()

const expected = {
  "Fast quadratic convergence": 2,
  // Cycles between 0 and 1: no order.
  "A two-cycle failure": null,
  // Order 2 once it settles; the fit still holds a step from before that.
  "Looks unstable, then converges": 1.9,
  // A triple root: Newton is only linear there.
  "Slow convergence at a multiple root": 1,
  "Nearly flat tangent": 1.85,
  // Diverges: no order.
  "Large jumps from shallow slopes": null
}

test('every example has an expected order', () => {
  for (const example of examples) {
    assert.ok(example.title in expected, `no expected order for "${example.title}"`)
  }
})

function orderFor(params, maxIterations) {
  const f = VM.expressions.makeFunction(globalThis.math, params.f)
  const df = VM.expressions.makeDerivative(globalThis.math, params.f)
  assert.ok(f && df, `could not parse f = ${params.f}`)
  const x0 = VM.expressions.makeNumber(globalThis.math, params.x0)
  return VM.numerical.orderFromSuccessiveErrors(newton(f, df, x0, maxIterations), "error", "xNext").order
}

for (const example of examples) {
  test(`${example.title}: convergence order`, () => {
    const want = expected[example.title]
    const order = orderFor(example.params, Number(example.params.max))
    if (want === null) {
      assert.ok(Number.isNaN(order), `expected no fit, got order ${order}`)
    } else {
      assert.ok(Math.abs(order - want) <= 0.15, `expected order ≈ ${want}, got ${order}`)
    }
  })
}

test('a large Max still reports order 2', () => {
  const order = orderFor({f: "x^2 - 2", x0: "1.5"}, 100)
  assert.ok(Math.abs(order - 2) <= 0.15, `expected order ≈ 2, got ${order}`)
})
