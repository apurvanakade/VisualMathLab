/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 1 tests that keep every convergence order the site reports
// verifiable. A page whose convergence plot reports or draws a fitted order
// or slope keeps its examples, method and fit in a colocated method.js,
// which its OJS cells import, and a method.test.js that runs every example
// through them and checks the number the plot reports. These check that
// each such page has both files, and that its examples only set fields the
// page can apply. (A convergence plot that reports no number, like the
// filter pages' running RMSE, needs neither.)

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Every app folder, the _template starter included: a page copied from it
// should arrive with both files.
function appDirs () {
  const result = []
  for (const slug of fs.readdirSync(path.join(repoRoot, 'apps')).sort()) {
    if (fs.existsSync(path.join(repoRoot, 'apps', slug, 'index.qmd'))) result.push(path.join('apps', slug))
  }
  return result
}

function read (relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

// The keys of a page's `exampleFieldSelectors = ({...})` cell.
function exampleFieldKeys (qmd) {
  const start = qmd.indexOf('exampleFieldSelectors = ({')
  if (start === -1) return null
  const end = qmd.indexOf('})', start)
  const keys = new Set()
  for (const match of qmd.slice(start, end).matchAll(/(\w+):\s*'\[data-example-field=/g)) keys.add(match[1])
  return keys
}

const convergencePages = []
for (const dir of appDirs()) {
  // A page reports an order or slope, or fits one (the _template starter
  // draws its fitted line without a number).
  if (/(order|slope) ≈|convergenceFit/.test(read(path.join(dir, 'index.qmd')))) convergencePages.push(dir)
}

test('the pages that report a convergence order are found', () => {
  assert.ok(convergencePages.length >= 9, `found only ${convergencePages.join(', ')}`)
})

for (const dir of convergencePages) {
  test(`${dir}: convergence plot is backed by a tested method.js`, () => {
    for (const file of ['method.js', 'method.test.js']) {
      assert.ok(fs.existsSync(path.join(repoRoot, dir, file)), `${dir}/${file} is missing`)
    }
    assert.match(read(path.join(dir, 'index.qmd')), /^import \{[^}]*\bexamples\b[^}]*\} from "\.\/method\.js"$/m,
      `${dir}/index.qmd should import its examples (and method) from ./method.js`)
  })

  // An imported name that a cell also defines ("methods" is both an export
  // and the legend's viewof on the ODE pages) is a runtime error in OJS
  // ("defined more than once") that no render catches.
  test(`${dir}: no name imported from method.js is also a cell`, () => {
    const qmd = read(path.join(dir, 'index.qmd'))
    const imported = qmd.match(/^import \{([^}]*)\} from "\.\/method\.js"$/m)
    assert.ok(imported, `${dir}/index.qmd has no import from ./method.js`)
    for (const raw of imported[1].split(',')) {
      const name = raw.trim()
      const cell = new RegExp(`^(viewof\\s+)?${name}\\s*=|^function\\s+${name}\\b`, 'm')
      assert.ok(!cell.test(qmd), `${name} is imported from method.js and also defined by a cell`)
    }
  })

  test(`${dir}: every example only sets fields the page can apply`, async () => {
    const keys = exampleFieldKeys(read(path.join(dir, 'index.qmd')))
    assert.ok(keys, `${dir}/index.qmd has no exampleFieldSelectors cell`)
    const { examples } = await import(path.join(repoRoot, dir, 'method.js'))
    assert.ok(examples.length > 0)
    for (const example of examples) {
      for (const key in example.params) {
        assert.ok(keys.has(key), `"${example.title}" sets ${key}, which exampleFieldSelectors doesn't list`)
      }
    }
  })
}
