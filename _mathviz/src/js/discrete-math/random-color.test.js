/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { randomColor } = VM.discreteMath

test('randomColor is roughly uniform over red/green/blue', () => {
  const counts = { red: 0, green: 0, blue: 0 }
  const trials = 30000
  for (let i = 0; i < trials; i++) {
    const color = randomColor()
    assert.ok(color === 'red' || color === 'green' || color === 'blue')
    counts[color]++
  }
  for (const color of ['red', 'green', 'blue']) {
    const frac = counts[color] / trials
    assert.ok(frac > 0.3 && frac < 0.37, `${color} fraction ${frac} should be roughly 1/3`)
  }
})
