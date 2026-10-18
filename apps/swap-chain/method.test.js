/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks the chain's invariants (swaps keep every margin, row shuffles keep
// only the row sums) and the numbers the lecture notes quote for the
// default matrix.

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { examples, parseMatrix, formatMatrix, runChain, stateAt, rowSums, colSums, checkerboards } from './method.js'

const VM = loadVM()
const matrixOf = title => parseMatrix(examples.find(e => e.title === title).params.matrix)

test('every example parses and round-trips', () => {
  for (const {title, params} of examples) {
    const m = parseMatrix(params.matrix)
    assert.ok(m, title)
    assert.equal(formatMatrix(m), params.matrix, title)
  }
})

test('the default matrix is the notes\' example', () => {
  const m = matrixOf('A segregated matrix')
  assert.deepEqual(colSums(m), [4, 5, 5, 5, 6, 6, 5, 5, 5, 4])
  assert.equal(checkerboards(m), 545)
})

test('swaps keep every row and column sum, and the count settles near 367', () => {
  const start = matrixOf('A segregated matrix')
  const run = runChain(start, {K: 20000, move: 'swap', rng: VM.sampling.seededRandom(1)})
  for (const t of [1, 10, 100, 5000, 20000]) {
    const m = stateAt(run, t)
    assert.deepEqual(rowSums(m), rowSums(start))
    assert.deepEqual(colSums(m), colSums(start))
    assert.equal(run.counts[t], checkerboards(m))
  }
  const after = Array.from(run.counts.slice(1000))
  const mean = after.reduce((a, b) => a + b) / after.length
  assert.ok(Math.abs(mean - 367) < 5, `${mean}`)
})

test('shuffling rows keeps the row sums but not the column sums', () => {
  const start = matrixOf('Shuffling rows instead')
  const run = runChain(start, {K: 200, move: 'rows', rng: VM.sampling.seededRandom(1)})
  const end = stateAt(run, 200)
  assert.deepEqual(rowSums(end), rowSums(start))
  assert.notDeepEqual(colSums(end), colSums(start))
})

test('no swap applies to a nested matrix', () => {
  const run = runChain(matrixOf("A nested matrix: the chain can't move"), {K: 2000, move: 'swap', rng: VM.sampling.seededRandom(1)})
  assert.ok(run.flipped.every(f => f === 0))
})
