/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Test/dev-only helper: loads the ACTUAL js/**/*.js files (not
// re-implementations) into a sandboxed `window`, in the same order
// _includes/head-scripts.html loads them in the browser, and returns the
// resulting VM object. This is what js/**/*.test.js files import so tests
// exercise the real production code, not a copy of it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(__dirname, '..')

export function loadVM(mathjs) {
  const headScripts = fs.readFileSync(path.join(repoRoot, '_includes/head-scripts.html'), 'utf8')
  const localScriptPaths = [...headScripts.matchAll(/<script src="(\/js\/[^"]+)">/g)].map(m => m[1])

  // Runs each file in THIS process's real global realm (not a separate
  // vm.createContext realm) so the plain objects/arrays these functions
  // return are ordinary, same-realm values -- a separate realm makes
  // assert.deepStrictEqual fail on a cross-realm prototype check even
  // when the structure matches. `node --test` runs each test file in its
  // own process, so setting real globals here doesn't leak across files.
  globalThis.window = globalThis
  globalThis.document = globalThis.document ?? { addEventListener: () => {} }
  // plotly-fullscreen-button.js registers a document listener, patches
  // Plotly.newPlot/react, and reads Plotly.Icons for its custom zoom
  // buttons -- all at load time, not inside a callable -- so each needs a
  // minimal stand-in even though these tests never touch the DOM.
  globalThis.Plotly = globalThis.Plotly ?? {
    newPlot: () => {},
    react: () => {},
    Icons: { zoom_plus: {}, zoom_minus: {} }
  }

  for (const scriptPath of localScriptPaths) {
    const filePath = path.join(repoRoot, scriptPath)
    const source = fs.readFileSync(filePath, 'utf8')
    // Indirect eval runs in global scope, matching how a <script> tag
    // would execute this IIFE-wrapped file in a browser.
    ;(0, eval)(source)
  }

  if (mathjs) globalThis.mathjs = mathjs

  return globalThis.VM
}
