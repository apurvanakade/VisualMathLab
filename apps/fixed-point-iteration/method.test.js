/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the slope its convergence plot
// reports, within 0.05.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, iterate, convergenceFit } from './method.js'

const VM = loadVM()

// Near a fixed point x* the error shrinks by |g'(x*)| per step, so the
// slope is log10|g'(x*)|; a positive slope means the iterates move away.
const expected = {
  // log10 sin(0.739) ≈ -0.17
  "Classic convergent iteration": -0.17,
  // g'(2) = 1/4: log10(1/4) ≈ -0.60
  "Converges to the positive fixed point": -0.6,
  // No fixed point attracts: the slope is noise around 0.
  "Chaotic wandering": 0.06,
  // |g'| = 2 everywhere: log10 2 ≈ 0.30
  "Repelling fixed point": 0.3,
  "Divergent oscillation": 0.3,
  // |g'| = 1: the distance never changes.
  "Neutral two-cycle": 0,
  // g'(0) = 1: sublinear, so the slope keeps flattening toward 0.
  "Very slow convergence": -0.03
}

test('every example has an expected slope', () => {
  for (const example of examples) {
    assert.ok(example.title in expected, `no expected slope for "${example.title}"`)
  }
})

function slopeFor(params, maxIterations) {
  const g = VM.expressions.makeFunction(globalThis.math, params.g)
  assert.ok(g, `could not parse g = ${params.g}`)
  const x0 = VM.expressions.makeNumber(globalThis.math, params.x0)
  return convergenceFit(iterate(g, x0, maxIterations)).slope
}

for (const example of examples) {
  test(`${example.title}: convergence slope`, () => {
    const want = expected[example.title]
    const slope = slopeFor(example.params, Number(example.params.max))
    assert.ok(Math.abs(slope - want) <= 0.05, `expected slope ≈ ${want}, got ${slope}`)
  })
}

test('a large Max still reports the contraction rate', () => {
  const slope = slopeFor({g: "sqrt(x + 2)", x0: "1"}, 200)
  assert.ok(Math.abs(slope + 0.6) <= 0.05, `expected slope ≈ -0.6, got ${slope}`)
})
