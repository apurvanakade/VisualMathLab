/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import * as mathjs from 'mathjs'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { polynomialFit } = VM.numerical

test('polynomialFit recovers exact coefficients of a degree-2 polynomial', () => {
  // y = 2x^2 - 3x + 1
  const points = []
  for (let x = -2; x <= 2; x++) points.push({ x, y: 2 * x * x - 3 * x + 1 })

  const fit = polynomialFit(mathjs, points, 2)
  assert.notEqual(fit, null)
  assert.ok(Math.abs(fit.coeffs[0] - 1) < 1e-8, `c0 ${fit.coeffs[0]}`)
  assert.ok(Math.abs(fit.coeffs[1] - -3) < 1e-8, `c1 ${fit.coeffs[1]}`)
  assert.ok(Math.abs(fit.coeffs[2] - 2) < 1e-8, `c2 ${fit.coeffs[2]}`)
  assert.ok(fit.totalSquaredError < 1e-8, `error ${fit.totalSquaredError}`)
})

test('polynomialFit exactly interpolates when point count equals coefficient count', () => {
  const points = [{ x: 0, y: 3 }, { x: 1, y: 1 }, { x: 2, y: 9 }]
  const fit = polynomialFit(mathjs, points, 2)
  assert.notEqual(fit, null)
  for (const p of points) {
    assert.ok(Math.abs(fit.evaluate(p.x) - p.y) < 1e-6, `evaluate(${p.x})`)
  }
  assert.ok(fit.totalSquaredError < 1e-8, `error ${fit.totalSquaredError}`)
})

test('polynomialFit returns null when there are fewer points than coefficients', () => {
  const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  assert.equal(polynomialFit(mathjs, points, 2), null)
})

test('polynomialFit degree 1 matches linearRegression on the same points', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 4 }, { x: 3, y: 8 }]
  const fit = polynomialFit(mathjs, points, 1)
  const { linearRegression } = VM.numerical
  const line = linearRegression(points)
  assert.ok(Math.abs(fit.coeffs[1] - line.slope) < 1e-8, `slope ${fit.coeffs[1]}`)
  assert.ok(Math.abs(fit.coeffs[0] - line.intercept) < 1e-8, `intercept ${fit.coeffs[0]}`)
})
