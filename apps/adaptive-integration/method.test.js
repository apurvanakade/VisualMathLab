/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Runs every example on the page through the tolerance sweep its
// convergence plots draw, and checks what those plots claim.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, adaptiveSimpson, toleranceSweep, tolerancePoints } from './method.js'

const VM = loadVM()

function sweepFor (example) {
  const p = example.params
  const f = VM.expressions.makeFunction(globalThis.math, p.f)
  const a = VM.expressions.makeNumber(globalThis.math, p.a)
  const b = VM.expressions.makeNumber(globalThis.math, p.b)
  assert.ok(f, `could not parse f = ${p.f}`)
  return toleranceSweep(f, Math.min(a, b), Math.max(a, b), Number(p.max))
}

test('evaluations are counted: 4 · panels + 1', () => {
  const run = adaptiveSimpson(x => Math.sin(x), 0, Math.PI, 1e-6, 15)
  assert.equal(run.evaluations, 4 * run.leaves.length + 1)
})

for (const example of examples) {
  test(`${example.title}: the actual error is within 10ε`, () => {
    const { rows } = sweepFor(example)
    assert.equal(rows.length, 37)
    // Each panel is accepted when its error estimate E is within its share
    // of ε, so the actual error meets ε only as far as E is right, and E
    // is a heuristic: it assumes Simpson's h⁴ error law, which a wide panel
    // over a feature doesn't follow yet. At ε ≥ 10^-2.25 the first panels
    // are that wide, and the sweep misses ε by up to 23x ("Narrow spike" at
    // ε = 10^-1.25). Past that it still misses by up to 6x ("Endpoint
    // behavior" at 10^-2.75, "Steep transition" at 10^-7, where a panel's
    // coarse and fine estimates agree by luck), never by 10x.
    for (const row of rows) {
      if (row.exponent < 2.5) continue
      assert.ok(row.adaptiveError <= 10 * row.tolerance, `e = ${row.exponent}: error ${row.adaptiveError} > 10ε`)
    }
  })
}

test('Only Endpoint behavior reaches Max depth, and only past ε = 10^-9', () => {
  // Near 0, sqrt(x)'s panel error shrinks like h^1.5 while each halving
  // also halves the panel's share of ε, so meeting ε there takes about
  // twice as many levels as decimals of ε: depth 40 is reached at 10^-9.
  // The plot marks that ε; every other example stays below its Max depth
  // across the whole sweep.
  for (const example of examples) {
    const { rows } = sweepFor(example)
    for (const row of rows) {
      const allowed = example.title === 'Endpoint behavior' && row.exponent >= 9
      assert.equal(row.depthLimited, allowed, `${example.title}, e = ${row.exponent}`)
    }
  }
})

test('Endpoint behavior: adaptive panels beat uniform ones at every cost', () => {
  // sqrt(x) has an unbounded derivative at 0, so the uniform grid's error
  // falls only like N^-1.5, while the adaptive rule crowds panels at 0 and
  // keeps its full order. At each tolerance tighter than 10^-3 it is
  // already more accurate than the uniform grid at the same cost, and by
  // ε = 10^-8 by more than a factor of 1000.
  const { rows } = sweepFor(examples.find(e => e.title === 'Endpoint behavior'))
  for (const row of rows) {
    if (row.exponent < 3.5) continue
    assert.ok(row.adaptiveError < row.uniformError, `e = ${row.exponent}`)
    if (row.exponent >= 8) assert.ok(row.adaptiveError * 1000 < row.uniformError, `e = ${row.exponent}`)
  }
})

test('Nonsmooth corner: adaptive panels beat uniform ones once the corner is isolated', () => {
  // |x| on [-2, pi] is linear on each side of 0, so Simpson's rule is exact
  // on every panel but the one holding the corner, and 0 is never a panel
  // edge (the interval's length is irrational). The adaptive rule halves
  // that one panel, quartering the error for 4 more evaluations, so its
  // error falls geometrically in the cost. The uniform grid's falls only
  // like N^-2 and jumps around with where the corner lands in its panel:
  // at ε = 10^-1.5 and 10^-2.5 it lands near an edge and the uniform grid
  // is the more accurate. From ε = 10^-2.75 on the adaptive rule always is,
  // and from 10^-3.75 on by more than a factor of 1000. Its error reaches
  // rounding level (and leaves the plots) at ε = 10^-8.25.
  const { rows } = sweepFor(examples.find(e => e.title === 'Nonsmooth corner'))
  for (const row of rows) {
    if (row.exponent < 2.75) continue
    assert.ok(row.adaptiveError < row.uniformError, `e = ${row.exponent}`)
    if (row.exponent >= 3.75) assert.ok(row.adaptiveError * 1000 < row.uniformError, `e = ${row.exponent}`)
    assert.equal(row.adaptiveError < 1e-15, row.exponent >= 8.25, `e = ${row.exponent}`)
  }
})

test('tolerancePoints: log₁₀ (error / ε), with exact errors dropped', () => {
  const rows = [
    { exponent: 2, tolerance: 1e-2, adaptiveError: 1e-1 },
    { exponent: 3, tolerance: 1e-3, adaptiveError: 1e-5 },
    { exponent: 4, tolerance: 1e-4, adaptiveError: 0 }
  ]
  const points = tolerancePoints(rows, 1, 'adaptiveError')
  assert.equal(points.length, 2)
  assert.ok(Math.abs(points[0].y - 1) < 1e-12 && Math.abs(points[1].y + 2) < 1e-12)
})
