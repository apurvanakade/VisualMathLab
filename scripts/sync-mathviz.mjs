/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Builds the mathviz library from _mathviz/ and installs the result as this
// site's Quarto extension at _extensions/mathviz/. Run via
// `npm run build:mathviz` after editing anything under _mathviz/src/.
//
// This repository is the source of truth for the library's code (see
// CLAUDE.md's mathviz section): _mathviz/ holds src/, the build script and
// the extension's two authored files, laid out at exactly the paths the
// apurvanakade/mathviz repository uses, so mirroring out is a path-for-path
// copy. _extensions/mathviz/ is generated output -- committed, because
// publish.yml runs a plain `quarto render` with no npm step, but never
// edited by hand.
//
// The build itself lives in _mathviz/scripts/build.mjs and is mirrored out
// unchanged; this wrapper is the one piece that is specific to this site, so
// that nothing site-shaped leaks into the library's own build.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const built = path.join(repoRoot, '_mathviz/_extensions/mathviz')
const installed = path.join(repoRoot, '_extensions/mathviz')

execFileSync(process.execPath, [path.join(repoRoot, '_mathviz/scripts/build.mjs')], { stdio: 'inherit' })

// build.mjs exits non-zero on a version mismatch or a syntax error, so
// reaching here means it ran -- but check the payload anyway rather than
// installing a half-written extension over a working one.
for (const rel of ['_extension.yml', 'mathviz.lua', 'dist/mathviz.js', 'dist/mathviz.css']) {
  if (!fs.existsSync(path.join(built, rel))) {
    console.error(`build.mjs produced no ${rel} in _mathviz/_extensions/mathviz/`)
    process.exit(1)
  }
}

// Remove first so a file dropped from the extension doesn't linger here.
fs.rmSync(installed, { recursive: true, force: true })
fs.cpSync(built, installed, { recursive: true })

const kb = (rel) => (fs.statSync(path.join(installed, rel)).size / 1024).toFixed(0)
console.log(`_extensions/mathviz/dist/mathviz.js  ${kb('dist/mathviz.js')} kB`)
console.log(`_extensions/mathviz/dist/mathviz.css ${kb('dist/mathviz.css')} kB`)
