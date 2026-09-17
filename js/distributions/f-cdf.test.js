/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { fCdf, fPdf, studentTCdf } = VM.distributions

test('equal degrees of freedom put the median at F = 1: cdf(1, d, d) = 1/2', () => {
  for (const d of [2, 5, 10, 40]) {
    assert.ok(Math.abs(fCdf(1, d, d) - 0.5) < 1e-10, `failed at d=${d}`)
  }
})

test('(d1, d2) = (1, 1): cdf(x) = (2/pi) * atan(sqrt(x))', () => {
  for (const x of [0.25, 1, 3, 9]) {
    assert.ok(
      Math.abs(fCdf(x, 1, 1) - (2 / Math.PI) * Math.atan(Math.sqrt(x))) < 1e-10,
      `failed at x=${x}`,
    )
  }
})

test('reciprocal identity: cdf_{F(d1,d2)}(x) = 1 - cdf_{F(d2,d1)}(1/x)', () => {
  for (const [x, d1, d2] of [[2, 4, 6], [0.3, 9, 3], [5.5, 12, 8]]) {
    assert.ok(
      Math.abs(fCdf(x, d1, d2) - (1 - fCdf(1 / x, d2, d1))) < 1e-10,
      `failed at x=${x}, d1=${d1}, d2=${d2}`,
    )
  }
})

test('t(k)^2 is distributed as F(1, k): P(F <= t^2) = 2 * cdf_t(t) - 1', () => {
  for (const [t, k] of [[1.5, 8], [2.2, 20], [0.6, 5]]) {
    const fromF = fCdf(t * t, 1, k)
    const fromT = 2 * studentTCdf(t, k) - 1
    assert.ok(Math.abs(fromF - fromT) < 1e-10, `failed at t=${t}, k=${k}`)
  }
})

test('textbook 0.95 critical value: cdf(3.3258, 5, 10) approx 0.95; cdf is the integral of fPdf', () => {
  assert.ok(Math.abs(fCdf(3.3258, 5, 10) - 0.95) < 1e-3, `got ${fCdf(3.3258, 5, 10)}`)
  let area = 0
  const dx = 0.005
  for (let x = dx / 2; x < 2.5; x += dx) area += fPdf(x, 6, 8) * dx
  assert.ok(Math.abs(area - fCdf(2.5, 6, 8)) < 2e-3, `got ${area} vs ${fCdf(2.5, 6, 8)}`)
})
