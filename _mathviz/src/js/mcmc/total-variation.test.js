/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { totalVariation } = VM.mcmc

test('totalVariation is half the L1 distance', () => {
  assert.equal(totalVariation([1, 0], [0, 1]), 1)
  assert.equal(totalVariation([0.5, 0.5], [0.5, 0.5]), 0)
  assert.ok(Math.abs(totalVariation([0.2, 0.3, 0.5], [0.1, 0.4, 0.5]) - 0.1) < 1e-12)
})
