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
//        node scripts/verify-pages.mjs root-finding/newton-method/index.qmd [...]

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
