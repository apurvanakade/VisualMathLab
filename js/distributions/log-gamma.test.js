/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { logGamma } = VM.distributions

test('logGamma matches known Gamma function values', () => {
  assert.ok(Math.abs(logGamma(1) - 0) < 1e-9, 'Gamma(1) = 1')
  assert.ok(Math.abs(logGamma(2) - 0) < 1e-9, 'Gamma(2) = 1')
  assert.ok(Math.abs(logGamma(5) - Math.log(24)) < 1e-9, 'Gamma(5) = 4! = 24')
  assert.ok(Math.abs(logGamma(10) - Math.log(362880)) < 1e-7, 'Gamma(10) = 9!')
  assert.ok(Math.abs(logGamma(0.5) - Math.log(Math.sqrt(Math.PI))) < 1e-9, 'Gamma(0.5) = sqrt(pi)')
})

test('logGamma stays finite well past the point Gamma itself overflows', () => {
  assert.ok(Number.isFinite(logGamma(500)))
  assert.ok(Number.isFinite(logGamma(2000)))
})
