/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page and checks the slope its convergence plot
// reports: within 0.05 of the expected slope, or no fit at all (null).

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, bisect, convergenceFit } from './method.js'

const VM = loadVM()

// Halving the bracket every step gives slope log10(1/2) ≈ -0.30.
const expected = {
  "Choosing one root among many": -0.3,
  "Same function, different bracket": -0.3,
  "Standard guaranteed convergence": -0.3,
  // 1/x changes sign at its pole: bisection stops at the first midpoint, 0.
  "Sign change without a valid root": null
}

test('every example has an expected slope', () => {
  for (const example of examples) {
    assert.ok(example.title in expected, `no expected slope for "${example.title}"`)
  }
})

function slopeFor(params, maxIterations) {
  const f = VM.expressions.makeFunction(globalThis.math, params.f)
  assert.ok(f, `could not parse f = ${params.f}`)
  const a = VM.expressions.makeNumber(globalThis.math, params.a)
  const b = VM.expressions.makeNumber(globalThis.math, params.b)
  return convergenceFit(bisect(f, a, b, maxIterations)).slope
}

for (const example of examples) {
  test(`${example.title}: convergence slope`, () => {
    const want = expected[example.title]
    const slope = slopeFor(example.params, Number(example.params.max))
    if (want === null) {
      assert.ok(Number.isNaN(slope), `expected no fit, got slope ${slope}`)
    } else {
      assert.ok(Math.abs(slope - want) <= 0.05, `expected slope ≈ ${want}, got ${slope}`)
    }
  })
}

test('a large Max still reports the halving rate', () => {
  const slope = slopeFor({f: "x^3 - x - 2", a: "1", b: "2"}, 200)
  assert.ok(Math.abs(slope + 0.3) <= 0.05, `expected slope ≈ -0.3, got ${slope}`)
})
