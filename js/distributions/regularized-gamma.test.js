/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { regularizedGammaP } = VM.distributions

// erf via the s = 1/2 special case, for the chi-square df = 1 checks below.
const erf = (z) => regularizedGammaP(0.5, z * z)

test('regularizedGammaP(1, x) = 1 - e^{-x} (the Exponential(1) CDF)', () => {
  for (const x of [0.1, 0.5, 1, 2.5, 7]) {
    assert.ok(Math.abs(regularizedGammaP(1, x) - (1 - Math.exp(-x))) < 1e-12, `failed at x=${x}`)
  }
})

test('regularizedGammaP is 0 at x = 0 and approaches 1 in the far tail', () => {
  assert.equal(regularizedGammaP(3, 0), 0)
  assert.ok(regularizedGammaP(3, 60) > 1 - 1e-10)
})

test('regularizedGammaP(1/2, x) = erf(sqrt(x)): erf(1) approx 0.8427007929', () => {
  assert.ok(Math.abs(erf(1) - 0.8427007929) < 1e-8, `got ${erf(1)}`)
})

test('regularizedGammaP is continuous across the series / continued-fraction switch at x = s + 1', () => {
  // The two evaluation branches meet at x = s + 1. Straddle the boundary by
  // a hair so the true function barely moves between the two points; any
  // gap left is the branch mismatch itself, which must be far below the
  // 1e-3-scale error a broken continued fraction would show.
  for (const s of [1, 4, 10, 25]) {
    const left = regularizedGammaP(s, s + 1 - 1e-9)
    const right = regularizedGammaP(s, s + 1 + 1e-9)
    assert.ok(Math.abs(left - right) < 1e-7, `s=${s}: left ${left}, right ${right}`)
  }
})
