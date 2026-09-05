/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Regenerates each method page's listing-card thumbnail (the `image:` PNG
// in its front matter) from the page's own live chart, so a chart-theme
// change (js/plotting/chart-theme.js) doesn't leave every card showing a
// stale screenshot. Scoped to pages whose main visual is a Plotly chart
// (`.plotly-box-large`, the class every mainPlot cell gives its graph div)
// -- the handful of pages built on a custom SVG/DOM visual instead
// (apps/butcher-tableau, and the four sperners-lemma
// pages) aren't touched by the chart theme at all, so their thumbnails
// don't go stale from this and are left alone; regenerate those by hand if
// their own visuals change.
//
// Reuses verify-pages.mjs's quarto-preview-then-Playwright approach rather
// than a plain static server, for the same reason: only a page that
// actually changed gets re-rendered on a warm docs/.
//
// Usage: node scripts/shoot-thumbnails.mjs (or: npm run thumbs)
//        node scripts/shoot-thumbnails.mjs apps/newton-method/index.qmd [...]

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const port = 8935
const readyTimeoutMs = 60000
const skipDirs = new Set(['docs', 'node_modules', '.quarto', '.git', '_freeze'])

function findLeafPages(dir, base = '') {
  const pages = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      pages.push(...findLeafPages(path.join(dir, entry.name), base + entry.name + '/'))
    } else if (entry.name === 'index.qmd' && base !== '') {
      // Only leaf pages carry an `image:` thumbnail -- listing/topic index
      // pages and the homepage don't.
      const text = fs.readFileSync(path.join(dir, entry.name), 'utf8')
      const match = text.match(/^image:\s*(\S+)\s*$/m)
      if (match) pages.push({ relDir: base, qmdPath: path.join(dir, entry.name), imageFile: match[1] })
    }
  }
  return pages
}

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

async function shootOne(browser, base, pageInfo) {
  const relHtml = pageInfo.relDir + 'index.html'
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 })
  await page.goto(base + relHtml, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1200)

  const allow = page.locator('button:has-text("Allow"), button:has-text("No thanks")').first()
  if (await allow.count()) await allow.click().catch(() => {})

  const chart = page.locator('.plotly-box-large').first()
  if ((await chart.count()) === 0) {
    console.log(`SKIP  ${relHtml} (no .plotly-box-large -- not a Plotly-chart page)`)
    await page.close()
    return false
  }

  // Hide the modebar and the floating legend/step overlays so the
  // thumbnail is just the chart itself, chrome-free.
  await page.addStyleTag({
    content: '.modebar-container, .ojs-legend-overlay, .ojs-step-overlay { display: none !important; }'
  })
  await page.waitForTimeout(300)

  const outPath = path.join(repoRoot, pageInfo.relDir, pageInfo.imageFile)
  await chart.screenshot({ path: outPath })
  console.log(`OK    ${relHtml} -> ${pageInfo.relDir}${pageInfo.imageFile}`)
  await page.close()
  return true
}

function qmdArgToPageInfo(arg) {
  const normalized = arg.replace(/^\.\//, '').replace(/\\/g, '/')
  if (!normalized.endsWith('index.qmd')) throw new Error(`Expected a path ending in index.qmd, got: ${arg}`)
  const qmdPath = path.join(repoRoot, normalized)
  const relDir = normalized.slice(0, -'index.qmd'.length)
  const text = fs.readFileSync(qmdPath, 'utf8')
  const match = text.match(/^image:\s*(\S+)\s*$/m)
  if (!match) throw new Error(`${arg} has no image: front matter -- not a leaf page with a thumbnail`)
  return { relDir, qmdPath, imageFile: match[1] }
}

async function main() {
  const args = process.argv.slice(2)
  const pages = args.length > 0 ? args.map(qmdArgToPageInfo) : findLeafPages(repoRoot)
  console.log(`Shooting ${pages.length} thumbnail(s)${args.length > 0 ? '' : ' (every leaf page with an image: front matter field)'}.\n`)

  console.log('Starting `quarto preview`...')
  const previewProc = await startPreview()
  console.log('Preview server ready.\n')

  const base = `http://localhost:${port}/`
  const browser = await chromium.launch()
  let shot = 0
  let skipped = 0
  try {
    for (const pageInfo of pages) {
      const did = await shootOne(browser, base, pageInfo)
      if (did) shot++
      else skipped++
    }
  } finally {
    await browser.close()
    stopPreview(previewProc)
  }

  console.log(`\n${shot} thumbnail(s) written, ${skipped} skipped.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
