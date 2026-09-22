/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { js, css, mustPrecede } from './manifest.mjs'

const srcDir = path.dirname(fileURLToPath(import.meta.url))

function listFiles(dir, ext) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listFiles(full, ext))
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith('.test.js')) {
      out.push(full)
    }
  }
  return out
}

test('every src/js file is listed exactly once, and every entry exists', () => {
  const onDisk = listFiles(path.join(srcDir, 'js'), '.js')
    .map(f => path.relative(path.join(srcDir, 'js'), f))
    .sort()
  const listed = [...js].sort()
  assert.deepEqual(listed, onDisk)
  assert.equal(new Set(js).size, js.length, 'duplicate entry in manifest.js')
})

test('every src/css file is listed exactly once, tokens first', () => {
  const onDisk = fs.readdirSync(path.join(srcDir, 'css')).filter(f => f.endsWith('.css')).sort()
  assert.deepEqual([...css].sort(), onDisk)
  assert.equal(css[0], 'tokens.css')
})

test('load-order constraints hold', () => {
  for (const [before, after] of mustPrecede) {
    const i = js.indexOf(before)
    assert.notEqual(i, -1, `${before} missing from manifest`)
    for (let j = 0; j < js.length; j++) {
      const matches = after instanceof RegExp ? after.test(js[j]) : js[j] === after
      if (!matches || js[j] === before) continue
      assert.ok(i < j, `${before} must load before ${js[j]}`)
    }
  }
})
