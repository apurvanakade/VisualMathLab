/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { bernoulliPmf } = VM.distributions

test('bernoulliPmf matches p and 1-p at k=1 and k=0', () => {
  assert.equal(bernoulliPmf(1, 0.3), 0.3)
  assert.equal(bernoulliPmf(0, 0.3), 0.7)
})

test('bernoulliPmf is 0 outside {0, 1}', () => {
  assert.equal(bernoulliPmf(2, 0.3), 0)
  assert.equal(bernoulliPmf(-1, 0.3), 0)
})
