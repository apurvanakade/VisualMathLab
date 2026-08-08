/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { seededRandom } = VM.sampling

test('seededRandom is deterministic: the same seed reproduces the same sequence', () => {
  const a = seededRandom(42)
  const b = seededRandom(42)
  const seqA = Array.from({length: 10}, () => a())
  const seqB = Array.from({length: 10}, () => b())
  assert.deepEqual(seqA, seqB)
})

test('seededRandom produces values in [0, 1)', () => {
  const rng = seededRandom(1)
  for (let i = 0; i < 1000; i++) {
    const x = rng()
    assert.ok(x >= 0 && x < 1, `expected value in [0,1), got ${x}`)
  }
})

test('seededRandom with different seeds produces different sequences', () => {
  const a = seededRandom(1)
  const b = seededRandom(2)
  const seqA = Array.from({length: 5}, () => a())
  const seqB = Array.from({length: 5}, () => b())
  assert.notDeepEqual(seqA, seqB)
})
