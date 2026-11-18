// Playwright isn't a dependency: every script uses the one copy installed
// globally (`npm install -g playwright && playwright install chromium`), so
// its browsers are already there and no checkout downloads its own.
// An ES module `import 'playwright'` never looks in the global folder, so
// resolve it here: NODE_PATH or a local install first, then `npm root -g`.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const require = createRequire(import.meta.url)

function load () {
  try {
    return require('playwright')
  } catch {}
  let root = ''
  try {
    root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
    return require(path.join(root, 'playwright'))
  } catch {
    throw new Error(`Playwright isn't installed globally${root ? ` (looked in ${root})` : ''}. ` +
      'Install it once: npm install -g playwright && playwright install chromium')
  }
}

export const { chromium, firefox, webkit, devices } = load()
