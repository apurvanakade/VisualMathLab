/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { symmetricEigenvalues } = VM.numerical

const close = (a, b, tol = 1e-9) => Math.abs(a - b) < tol

test('symmetricEigenvalues of a diagonal matrix, sorted descending', () => {
  assert.deepEqual(symmetricEigenvalues([[1, 0, 0], [0, 3, 0], [0, 0, 2]]), [3, 2, 1])
})

test('symmetricEigenvalues of [[2, 1], [1, 2]] are 3 and 1', () => {
  const values = symmetricEigenvalues([[2, 1], [1, 2]])
  assert.ok(close(values[0], 3) && close(values[1], 1))
})

test('symmetricEigenvalues of the walk on a 4-cycle: 1, 0, 0, -1', () => {
  // Regular graph, so the symmetrized walk matrix is just P.
  const P = [[0, 0.5, 0, 0.5], [0.5, 0, 0.5, 0], [0, 0.5, 0, 0.5], [0.5, 0, 0.5, 0]]
  const values = symmetricEigenvalues(P)
  const expected = [1, 0, 0, -1]
  for (let i = 0; i < 4; i++) assert.ok(close(values[i], expected[i]), `${values}`)
})

test('symmetricEigenvalues preserves the trace and leaves A alone', () => {
  const A = [[4, 1, 2], [1, 3, 0.5], [2, 0.5, 1]]
  const copy = JSON.parse(JSON.stringify(A))
  const values = symmetricEigenvalues(A)
  assert.ok(close(values[0] + values[1] + values[2], 8))
  assert.deepEqual(A, copy)
  assert.deepEqual(symmetricEigenvalues([]), [])
})
