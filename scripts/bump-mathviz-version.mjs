/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Sets the mathviz library's version in the three files a consumer can see:
// the npm manifest, the extension manifest Quarto reads, and the Lua filter
// that names the site_libs/quarto-contrib/mathviz-<version>/ folder.
// _mathviz/scripts/build.mjs refuses to build unless all three agree, so
// they are bumped together or not at all.
//
// Usage: node scripts/bump-mathviz-version.mjs 0.1.5
//
// Run by .github/workflows/release-mathviz.yml, and fine to run by hand.
// Bumping is not just bookkeeping: that Lua VERSION is the published
// bundle's cache-bust, so shipping new bytes under an old version leaves
// returning visitors on the one their browser already has.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(String(version))) {
  console.error(`Usage: node scripts/bump-mathviz-version.mjs <major.minor.patch>  (got ${JSON.stringify(version)})`)
  process.exit(1)
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const edits = [
  ['_mathviz/package.json', /^(\s*"version":\s*")[^"]+(")/m],
  ['_mathviz/_extensions/mathviz/_extension.yml', /^(version:\s*)\S+()$/m],
  ['_mathviz/_extensions/mathviz/mathviz.lua', /^(local VERSION\s*=\s*")[^"]+(")/m]
]

for (const [rel, pattern] of edits) {
  const file = path.join(repoRoot, rel)
  const before = fs.readFileSync(file, 'utf8')
  if (!pattern.test(before)) {
    console.error(`${rel}: no version line matching ${pattern}`)
    process.exit(1)
  }
  const after = before.replace(pattern, `$1${version}$2`)
  fs.writeFileSync(file, after)
  console.log(`${rel} -> ${version}`)
}
