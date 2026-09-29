/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { urlParam, syncUrlParams } = VM.ui

test('urlParam types its value like the fallback', () => {
  const search = '?n=250&bad=abc&empty=&name=Barbell&lazy=1&off=false'
  assert.equal(urlParam('n', 10, {search}), 250)
  assert.equal(urlParam('bad', 10, {search}), 10)
  assert.equal(urlParam('empty', 10, {search}), 10)
  assert.equal(urlParam('missing', 10, {search}), 10)
  assert.equal(urlParam('name', 'Cycle', {search}), 'Barbell')
  assert.equal(urlParam('lazy', false, {search}), true)
  assert.equal(urlParam('off', true, {search}), false)
})

test('syncUrlParams sets changed keys, drops defaults and keeps other keys', () => {
  const search = '?embed=pi-app&pi_n=500&other=x'
  const query = syncUrlParams({pi_n: [1000, 1000], pi_seed: [7, 1]}, {search})
  assert.equal(query, 'embed=pi-app&other=x&pi_seed=7')
  assert.equal(syncUrlParams({a: [1, 1]}, {search: ''}), '')
})

test('syncUrlParams writes to history when reading the live URL', () => {
  const calls = []
  globalThis.location = {search: '?keep=1', pathname: '/chapters/x.html', hash: '#sec'}
  globalThis.history = {replaceState: (state, title, url) => calls.push(url)}
  syncUrlParams({n: [5, 1]})
  assert.deepEqual(calls, ['/chapters/x.html?keep=1&n=5#sec'])
})
