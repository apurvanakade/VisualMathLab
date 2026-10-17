/**
 * Copyright (c) 2026 TODO Your Name. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: TODO Your Name
 */

// TODO: runs every example on the page and checks what its convergence plot
// reports. Write down what each example should show (an order, a rate, or
// no fit) and why, then check the page shows it.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, iterate, convergenceFit } from './method.js'

const VM = loadVM()

// The slope of log10|xₙ₊₁ − xₙ| against n is log10|g'(x*)| near a fixed point x*.
const expected = {
  // log10 sin(0.739) ≈ -0.17
  "cos(x), from 1": -0.17,
  // g'(2) = 1/4: log10(1/4) ≈ -0.60
  "sqrt(2 + x), from 0": -0.6,
  // g'(2/3) = -1: the iterates oscillate around 2/3 and close in sublinearly.
  "Slow oscillation: 3*x*(1 - x) from 0.4": -0.03
}

test('every example has an expected slope', () => {
  for (const example of examples) {
    assert.ok(example.title in expected, `no expected slope for "${example.title}"`)
  }
})

for (const example of examples) {
  test(`${example.title}: convergence slope`, () => {
    const p = example.params
    const g = VM.expressions.makeFunction(globalThis.math, p.g)
    assert.ok(g, `could not parse g = ${p.g}`)
    const x0 = VM.expressions.makeNumber(globalThis.math, p.x0)
    const {slope} = convergenceFit(iterate(g, x0, Number(p.max)))
    const want = expected[example.title]
    assert.ok(Math.abs(slope - want) <= 0.05, `expected slope ≈ ${want}, got ${slope}`)
  })
}
