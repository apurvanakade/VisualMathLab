/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { studentTCdf, studentTPdf } = VM.distributions

test('k = 1 is the standard Cauchy: cdf(x) = 1/2 + atan(x)/pi', () => {
  for (const x of [-3, -0.7, 0, 1, 2.5]) {
    assert.ok(Math.abs(studentTCdf(x, 1) - (0.5 + Math.atan(x) / Math.PI)) < 1e-10, `failed at x=${x}`)
  }
})

test('cdf(0) = 1/2 for every k, and the distribution is symmetric about 0', () => {
  for (const k of [1, 4, 30, 500]) {
    assert.ok(Math.abs(studentTCdf(0, k) - 0.5) < 1e-12, `cdf(0) failed at k=${k}`)
    assert.ok(Math.abs(studentTCdf(-1.8, k) - (1 - studentTCdf(1.8, k))) < 1e-12, `symmetry failed at k=${k}`)
  }
})

test('large k approaches the standard normal: cdf(1.959964, 1e7) approx 0.975', () => {
  assert.ok(Math.abs(studentTCdf(1.959964, 1e7) - 0.975) < 1e-4, `got ${studentTCdf(1.959964, 1e7)}`)
})

test('classic critical values: cdf(2.228, 10) approx 0.975, cdf(3.169, 10) approx 0.995', () => {
  assert.ok(Math.abs(studentTCdf(2.228, 10) - 0.975) < 1e-3, `got ${studentTCdf(2.228, 10)}`)
  assert.ok(Math.abs(studentTCdf(3.169, 10) - 0.995) < 1e-3, `got ${studentTCdf(3.169, 10)}`)
})

test('cdf is the integral of studentTPdf (trapezoid over a wide window), k = 3', () => {
  let area = 0
  const dx = 0.005
  for (let x = -80; x < 1.2; x += dx) area += studentTPdf(x, 3) * dx
  assert.ok(Math.abs(area - studentTCdf(1.2, 3)) < 1e-3, `got ${area} vs ${studentTCdf(1.2, 3)}`)
})
