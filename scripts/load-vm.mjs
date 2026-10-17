/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Test-only helper: loads the installed mathviz release
// (_extensions/apurvanakade/mathviz/dist/mathviz.js, the same file every page
// gets in its <head>) into this process's global scope, with math.js as
// window.math the way the CDN script provides it, and returns window.VM.
// An app's method.test.js uses it so its method.js runs against the real
// library, and parses each example's formula exactly as the page does.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as mathjs from 'mathjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundle = path.join(repoRoot, '_extensions/apurvanakade/mathviz/dist/mathviz.js')

export function loadVM() {
  if (globalThis.VM) return globalThis.VM
  // The bundle registers a document listener and patches Plotly at load
  // time, outside any function, so both need a stand-in even though the
  // numerical code never touches the DOM. `node --test` runs each test file
  // in its own process, so these globals don't leak between files.
  globalThis.window = globalThis
  globalThis.document = globalThis.document ?? { addEventListener: () => {} }
  globalThis.Plotly = globalThis.Plotly ?? {
    newPlot: () => {},
    react: () => {},
    Icons: { zoom_plus: {}, zoom_minus: {} }
  }
  globalThis.math = mathjs
  // Indirect eval runs in global scope, as a <script> tag would.
  ;(0, eval)(fs.readFileSync(bundle, 'utf8'))
  return globalThis.VM
}
