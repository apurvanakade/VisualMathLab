/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Browser-level check for every page: `quarto render` only catches
// Pandoc/parse errors, not OJS runtime errors (e.g. a renamed VM.category.fn
// call site only surfaces as a browser console TypeError). This script
// spawns `quarto preview` (rather than a blocking `quarto render` followed by
// a plain static file server) so that on a warm docs/ directory only the
// files that actually changed since the last run get re-rendered -- `quarto
// render` unconditionally re-renders the entire site every time, which is
// wasted work for the common edit-then-verify loop. On a cold/missing docs/
// it still does a full render up front (quarto needs the whole site's
// metadata to build navigation/search), so the first run of a session pays
// the same cost `quarto render` would have.
//
// The page list itself is discovered from the *source* .qmd files (every
// `index.qmd` under the project, matching this repo's page-naming
// convention -- see CLAUDE.md) rather than by walking a pre-existing docs/
// directory, since with preview there's no guarantee docs/ is populated (or
// current) before this script starts.
//
// Pass one or more .qmd paths as CLI args to check only those pages instead
// of the whole site -- much faster while iterating on a specific page,
// since `quarto preview`'s own startup/render is paid once regardless, but
// only the requested pages get a browser pass.
//
// Usage: node scripts/verify-pages.mjs (or: npm run verify)
//        node scripts/verify-pages.mjs apps/newton-method/index.qmd [...]

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const port = 8934
const readyTimeoutMs = 60000

const skipDirs = new Set(['docs', 'node_modules', '.quarto', '.git', '_freeze'])

function findQmdPages(dir, base = '') {
  const pages = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      pages.push(...findQmdPages(path.join(dir, entry.name), base + entry.name + '/'))
    } else if (entry.name === 'index.qmd') {
      pages.push(base + 'index.html')
    }
  }
  return pages
}

// Spawned detached (its own process group) so that on cleanup we can kill
// quarto's own child processes too, not just the immediate `quarto` process
// -- the CLI itself forks a renderer/server subprocess.
function startPreview() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'quarto',
      ['preview', '--port', String(port), '--no-browser', '--timeout', '120'],
      { cwd: repoRoot, detached: true }
    )

    let settled = false
    let output = ''
    const onOutput = (data) => {
      output += data.toString()
      if (!settled && /Listening on|Browse at/i.test(output)) {
        settled = true
        resolve(proc)
      }
    }
    proc.stdout.on('data', onOutput)
    proc.stderr.on('data', onOutput)
    proc.on('error', reject)
    proc.on('exit', (code) => {
      if (!settled) reject(new Error(`quarto preview exited (code ${code}) before becoming ready:\n${output}`))
    })
    setTimeout(() => {
      if (!settled) reject(new Error(`quarto preview did not become ready within ${readyTimeoutMs}ms:\n${output}`))
    }, readyTimeoutMs)
  })
}

function stopPreview(proc) {
  if (!proc || proc.killed || proc.exitCode !== null) return
  try {
    process.kill(-proc.pid, 'SIGTERM')
  } catch {
    proc.kill('SIGTERM')
  }
}

// Two whole classes of bug on this site are invisible to an error-console
// check, because nothing throws -- the page just renders wrong:
//
//   1. A floating panel gets clipped by an ancestor. Quarto gives
//      `.cell-output-display` (the wrapper around every OJS cell output)
//      `overflow: auto`, which makes it a scroll container that clips
//      anything escaping its box. The playback popover is only visible
//      because it is a top-layer [popover]; nest it, or reintroduce a clip
//      via overflow/transform/filter/contain on any wrapper, and it silently
//      disappears.
//   2. A control gets squeezed to nothing by a cascade fight. Observable
//      Inputs injects its own `.oi-<hash>` rules into <head> at RUNTIME, so
//      they land after this project's stylesheet and beat any rule of equal
//      specificity -- which once left slider tracks about 35px wide, and in
//      one arrangement 0px.
//
// Both are caught here by asserting the rendered outcome rather than the CSS
// that is supposed to produce it, so this keeps working whatever the cause
// (an Observable Inputs upgrade, a new wrapper, a refactor of styles.css).
async function checkSliderControls(page, errors) {
  const trackProblems = await page.evaluate(() => {
    // Both thresholds are derived from a measurement of all 24 sliders on the
    // site at this viewport, not picked by feel:
    //   narrowest legitimate track: 147px, at 49% of its form
    //     (apps/positive-predictive-value, three sliders sharing a panel grid row)
    //   widest: 706px at 80% (the root-finding step sliders)
    //   the regressions being guarded against measured 0px, and 35px in a
    //     ~250px form -- i.e. 14% of it
    // So each floor sits roughly a third below the narrowest real value and
    // far above both failures. Re-measure rather than lower a threshold if a
    // legitimately narrower control is ever added.
    //
    // The ratio matters as much as the pixel count: it is what catches a
    // track squeezed by a label or readout that took the row, and unlike an
    // absolute width it does not move when the viewport does.
    const MIN_TRACK_PX = 100
    const MIN_TRACK_RATIO = 0.35
    const bad = []
    for (const input of document.querySelectorAll('.ojs-panel input[type="range"], .ojs-chart-controls input[type="range"]')) {
      const form = input.closest('form') || input
      // Skip anything not actually laid out: a collapsed callout, or a panel
      // hidden at this viewport. offsetParent is null for display:none
      // subtrees, which is exactly those cases.
      if (form.offsetParent === null) continue
      if (form.getBoundingClientRect().width === 0) continue
      const formWidth = form.getBoundingClientRect().width
      const width = Math.round(input.getBoundingClientRect().width)
      const ratio = width / formWidth
      const label = (form.querySelector('label')?.textContent || '?').trim()
      if (width < MIN_TRACK_PX) {
        bad.push(`slider "${label}" track is ${width}px wide (expected >= ${MIN_TRACK_PX}px)`)
      } else if (ratio < MIN_TRACK_RATIO) {
        bad.push(`slider "${label}" track is only ${Math.round(ratio * 100)}% of its control ` +
                 `(${width}px of ${Math.round(formWidth)}px, expected >= ${Math.round(MIN_TRACK_RATIO * 100)}%)`)
      }
    }
    return bad
  })
  for (const problem of trackProblems) errors.push(`layout: ${problem}`)

  // Open each playback popover and assert it actually paints where it says
  // it does -- getBoundingClientRect alone would not notice, since a clipped
  // element still reports a full-size box.
  const carets = page.locator('.vm-play-more')
  const caretCount = await carets.count()
  for (let i = 0; i < caretCount; i++) {
    const caret = carets.nth(i)
    if (!(await caret.isVisible())) continue
    await caret.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(150)
    const problem = await page.evaluate(() => {
      const panel = document.querySelector('.vm-play-panel:popover-open')
      if (!panel) return 'playback popover did not open'
      const r = panel.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return 'playback popover opened with a zero-size box'
      // Sample the panel's own top-left region: that is the part that ends up
      // outside an ancestor's box first, so it is where clipping shows up.
      const hit = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + 6)
      if (hit && (hit === panel || panel.contains(hit))) return null
      const what = hit ? (hit.id || (hit.className || '').toString().trim().split(/\s+/)[0] || hit.tagName) : 'nothing'
      return `playback popover is not visible at its own coordinates (covered/clipped by: ${what})`
    })
    if (problem) errors.push(`layout: ${problem}`)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(100)
  }
}

async function checkPage(browser, base, relPath) {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  page.on('requestfailed', req => {
    errors.push(`requestfailed: ${req.url()} -- ${req.failure()?.errorText ?? ''}`)
  })

  await page.goto(base + relPath, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1500)

  // Layout assertions run before the generic button-mashing below, so they
  // see each page's initial render rather than whatever state clicking
  // everything leaves behind.
  await checkSliderControls(page, errors)

  const buttons = page.locator('button')
  const buttonCount = await buttons.count()
  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i)
    if (await button.isVisible()) {
      await button.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(100)
    }
  }

  const sliders = page.locator('input[type=range]')
  const sliderCount = await sliders.count()
  for (let i = 0; i < sliderCount; i++) {
    const slider = sliders.nth(i)
    const min = Number((await slider.getAttribute('min')) ?? 0)
    const max = Number((await slider.getAttribute('max')) ?? 100)
    await slider.fill(String(min + (max - min) / 2)).catch(() => {})
    await page.waitForTimeout(100)
  }

  await page.waitForTimeout(300)
  await page.close()
  return errors
}

function qmdArgToRelPath(arg) {
  const normalized = arg.replace(/^\.\//, '').replace(/\\/g, '/')
  if (!normalized.endsWith('index.qmd')) {
    throw new Error(`Expected a path ending in index.qmd, got: ${arg}`)
  }
  return normalized.slice(0, -'index.qmd'.length) + 'index.html'
}

async function main() {
  const args = process.argv.slice(2)
  const pages = args.length > 0
    ? args.map(qmdArgToRelPath).sort()
    : findQmdPages(repoRoot).sort()
  console.log(`Checking ${pages.length} page(s)${args.length > 0 ? '' : ' (full site, from source index.qmd files)'}.\n`)

  console.log('Starting `quarto preview`...')
  const previewProc = await startPreview()
  console.log('Preview server ready.\n')

  const base = `http://localhost:${port}/`
  const browser = await chromium.launch()

  let anyFailure = false
  try {
    for (const relPath of pages) {
      const errors = await checkPage(browser, base, relPath)
      if (errors.length) {
        anyFailure = true
        console.log(`FAIL  ${relPath}`)
        for (const e of errors) console.log(`      ${e}`)
      } else {
        console.log(`OK    ${relPath}`)
      }
    }
  } finally {
    await browser.close()
    stopPreview(previewProc)
  }

  console.log(anyFailure ? '\nSome pages failed.' : '\nAll pages passed.')
  process.exit(anyFailure ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
