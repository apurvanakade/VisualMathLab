/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { statRow } = VM.ui

test('statRow builds one labelled tile per item', () => {
  const make = (tag) => {
    const el = {tag, className: '', title: '', textContent: '', children: []}
    el.append = (...nodes) => el.children.push(...nodes)
    return el
  }
  globalThis.document.createElement = make

  const row = statRow([{label: 'Estimate', value: 3.14, title: 'pi hat'}, {label: 'n', value: '100'}])
  assert.equal(row.className, 'vm-stat-row')
  assert.equal(row.children.length, 2)
  const [label, value] = row.children[0].children
  assert.equal(row.children[0].title, 'pi hat')
  assert.equal(label.textContent, 'Estimate')
  assert.equal(value.textContent, '3.14')
  assert.equal(value.className, 'vm-stat-value')
})
