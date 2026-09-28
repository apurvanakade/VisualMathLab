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

globalThis.window = globalThis
globalThis.document = { addEventListener: () => {}, documentElement: { classList: { contains: () => false } } }
;(0, eval)(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'site.js'), 'utf8'))
const { siteRelativePath } = globalThis.VM.chrome

test('siteRelativePath strips a /docs/ prefix when the repo root is served', () => {
  const path = siteRelativePath({ href: 'http://localhost:8000/docs/apps/newton-method/?f=x', offset: '../../' })
  assert.equal(path, '/apps/newton-method/')
})

test('siteRelativePath strips the prefix for a top-level page too', () => {
  assert.equal(siteRelativePath({ href: 'http://localhost:8000/docs/embed.html', offset: './' }), '/embed.html')
})

test('siteRelativePath leaves a root-served path alone', () => {
  const path = siteRelativePath({ href: 'https://www.visualmathlab.com/apps/newton-method/index.html', offset: '../../' })
  assert.equal(path, '/apps/newton-method/index.html')
})

test('siteRelativePath falls back to the pathname when there is no offset meta', () => {
  assert.equal(siteRelativePath({ href: 'http://localhost/docs/apps/x/', offset: undefined }), '/docs/apps/x/')
})

test('siteRelativePath strips a GitHub Pages project-site prefix', () => {
  const p = siteRelativePath({ href: 'https://apurvanakade.github.io/Monte-Carlo-Methods/chapters/intro.html', offset: '../' })
  assert.equal(p, '/chapters/intro.html')
})
