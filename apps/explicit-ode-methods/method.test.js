/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the orders its convergence
// plot reports: Euler 1, improved Euler 2 and RK4 4, each within 0.15.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, methodErrors, endpointErrors, convergenceFit } from './method.js'

const VM = loadVM()

const expectedOrder = {"Euler": 1, "Improved Euler": 2, "RK4": 4}

for (const example of examples) {
  test(`${example.title}: convergence orders`, () => {
    const p = example.params
    const f = VM.expressions.makeFunction2(globalThis.math, p.f)
    assert.ok(f, `could not parse f = ${p.f}`)
    const y0 = VM.expressions.makeNumber(globalThis.math, p.y0)
    const b = VM.expressions.makeNumber(globalThis.math, p.b)
    const { rows, trueValue } = endpointErrors(f, y0, b, Number(p.max))
    for (const method of methodErrors) {
      const want = expectedOrder[method.name]
      const { order } = convergenceFit(rows, trueValue, method.errorKey)
      assert.ok(Math.abs(order - want) <= 0.15, `${method.name}: expected order ≈ ${want}, got ${order}`)
    }
  })
}
