/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { runningMean } = VM.mcmc

test('runningMean averages each prefix', () => {
  assert.deepEqual(runningMean([2, 4, 6, 8]), [2, 3, 4, 5])
  assert.deepEqual(runningMean([]), [])
})
