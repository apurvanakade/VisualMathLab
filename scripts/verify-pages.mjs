/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Browser-level check for every page: `quarto render` only catches
// Pandoc/parse errors, not OJS runtime errors (e.g. a renamed VM.category.fn
// call site only surfaces as a browser console TypeError). Each page is
// loaded once and its controls exercised; see checkPage for what is and
// isn't asserted. This script
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
// only the requested pages get a browser pass. `--changed` picks that list
// for you: every page whose folder differs from `develop` (committed,
// staged, unstaged or untracked). It falls back to the full site when the
// diff also touches something that is baked into every page (the mathviz
// extension -- theme, fonts and chrome included -- an include, _quarto.yml),
// since a per-page check cannot see a regression on a page it did not load.
//
// Pages are crawled a few at a time (`--jobs N`, default 4) as separate tabs
// of one Chromium; results still print in sorted page order.
//
// Usage: node scripts/verify-pages.mjs (or: npm run verify)
//        node scripts/verify-pages.mjs apps/newton-method/index.qmd [...]
//        node scripts/verify-pages.mjs --changed
//        node scripts/verify-pages.mjs --jobs 8

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const port = 8934
const readyTimeoutMs = 60000
// A ceiling, not a delay: a settled page costs one poll. Generous because
// four pages share one CI runner and the slowest (particle-filter) can take
// several seconds to finish its first run there.
const settleTimeoutMs = 15000
const defaultJobs = 4

const skipDirs = new Set(['docs', 'node_modules', '.quarto', '.git', '_freeze'])

// Anything under these paths lands in every rendered page (the extension's
// <head> tags, the includes, the theme, the sidebar), so a change there
// cannot be verified by loading only the pages whose source changed.
// _sidebar.yml is the generated sidebar; apps/_metadata.yml is front matter
// every app page inherits.
const siteWidePaths = ['_extensions/', '_includes/', '_quarto.yml', '_sidebar.yml', 'apps/_metadata.yml']

function findQmdPages(dir, base = '') {
  const pages = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      // Quarto never renders an underscore-prefixed folder (apps/_template,
      // _extensions, _includes), so there is no page to load for one.
      if (entry.name.startsWith('_')) continue
      pages.push(...findQmdPages(path.join(dir, entry.name), base + entry.name + '/'))
    } else if (entry.name === 'index.qmd') {
      pages.push(base + 'index.html')
    }
  }
  return pages
}

function gitLines(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed:\n${result.stderr}`)
  }
  const lines = []
  for (const line of result.stdout.split('\n')) {
    if (line.trim() !== '') lines.push(line.trim())
  }
  return lines
}

// Every page whose folder has a file that differs from `develop`, or null
// when the diff touches a site-wide path and only the full crawl will do.
// `git diff develop` compares the working tree (committed + staged +
// unstaged) against the branch; untracked files come from ls-files.
function findChangedPages() {
  const changedFiles = gitLines(['diff', '--name-only', 'develop', '--'])
  for (const file of gitLines(['ls-files', '--others', '--exclude-standard'])) changedFiles.push(file)

  const pages = new Set()
  for (const file of changedFiles) {
    for (const prefix of siteWidePaths) {
      if (file.startsWith(prefix)) {
        console.log(`--changed: ${file} is site-wide, so every page is checked.`)
        return null
      }
    }
    const folder = path.dirname(file)
    if (folder === '.') {
      // random-apps.ejs is the template of a listing on the homepage.
      if (file === 'index.qmd' || file === 'random-apps.ejs') pages.add('index.html')
      continue
    }
    if (path.basename(folder).startsWith('_')) continue
    if (!fs.existsSync(path.join(repoRoot, folder, 'index.qmd'))) continue
    pages.add(folder + '/index.html')
  }
  return [...pages]
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

// True once no OJS cell is still evaluating and, on an app page, its app has
// drawn something, so the controls exercised below exist and are wired up.
// Quarto's `ojs-in-a-box-waiting-for-module-import` class is not the marker
// to watch: it is only ever cleared when the page's OJS module has `import`s
// (none here does), so it stays on every cell forever. The Observable
// inspector's `--running` class is, with one exception: a declaration cell
// (`function f() {}`) never gets its inspector fulfilled, so it reports
// running for the life of the page.
function isSettled(isApp) {
  for (const el of document.querySelectorAll('.observablehq--running')) {
    const cell = el.closest('[data-nodetype]')
    if (cell && cell.dataset.nodetype === 'declaration') continue
    return false
  }
  if (isApp) {
    const app = document.querySelector('.vm-app')
    if (app && !app.querySelector('.plotly, svg')) return false
  }
  return true
}

async function waitForSettle(page, relPath) {
  const isApp = relPath.startsWith('apps/')
  await page.waitForFunction(isSettled, isApp, { timeout: settleTimeoutMs, polling: 50 }).catch(() => {})
}

// Two page-authoring mistakes that render fine and throw nothing, so the
// error console would never show them. Both are read off the loaded page,
// without a second load. Runs in the page.
//   - No <div class="vm-app"> (CLAUDE.md, "Embed mode"): ?embed=1 would then
//     show the whole page instead of the app.
//   - The "Try an example" dropdown opening on anything but the first
//     example (CLAUDE.md, "URL-shareable inputs and example presets"): the
//     page's default inputs and examples[0] have drifted apart.
function authoringProblems(isApp) {
  const problems = []
  if (isApp && !document.querySelector('#quarto-document-content .vm-app')) {
    problems.push('no .vm-app block on the page (wrap the app in <div class="vm-app">)')
  }
  for (const form of document.querySelectorAll('.vm-app form')) {
    if (!form.textContent.includes('Try an example')) continue
    const select = form.querySelector('select')
    if (!select || select.options.length < 2) break
    const label = select.options[select.selectedIndex].textContent
    const first = select.options[1].textContent
    if (label === 'Custom inputs') {
      problems.push('example dropdown: page opens on "Custom inputs" -- its default inputs match no example')
    } else if (label !== first) {
      problems.push(`example dropdown: page opens on "${label}", not the first example "${first}" -- ` +
                    'put the example matching the default inputs first')
    }
    break
  }
  return problems
}

// The giscus comment frame (_includes/giscus.html) on every app page is
// blocked rather than loaded from the live giscus.app: a page with no
// discussion yet makes the real widget log 404s, and the crawl shouldn't hinge
// on a third party anyway. Blocked through CDP, not page.route: routing turns
// off the HTTP cache for the whole page, so every page re-downloaded Plotly,
// math.js and MathJax. (The cross-origin frame's own document request may
// still go out, but everything it loads is blocked, so the widget never
// runs.) Any console error or failed request from giscus.app is ignored via
// isGiscus.
function isGiscus(url) {
  return typeof url === 'string' && url.startsWith('https://giscus.app/')
}

async function blockGiscus(page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setBlockedURLs', { urls: ['https://giscus.app/*'] })
}

// One load per page: no console error, page error or failed request, while
// every button is clicked and every slider moved. Layout (slider widths,
// popovers, phone width) and mathviz's own chrome (share dialog, embed mode)
// are deliberately not asserted anywhere: checking them in a busy CI browser
// made the crawl slow and flaky. Look at a changed page, phone width included.
async function checkPage(browser, base, relPath) {
  const page = await browser.newPage()
  await blockGiscus(page)
  const errors = []
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error' && !isGiscus(msg.location().url)) errors.push(`console.error: ${msg.text()}`)
  })
  page.on('requestfailed', req => {
    if (isGiscus(req.url())) return
    errors.push(`requestfailed: ${req.url()} -- ${req.failure()?.errorText ?? ''}`)
  })

  await page.goto(base + relPath, { waitUntil: 'networkidle', timeout: 30000 })
  await waitForSettle(page, relPath)

  // Answer the consent banner first, the way a returning reader already
  // has: it is fixed to the bottom of the window and would otherwise take
  // the clicks meant for controls under it. npm run verify:analytics tests
  // the banner itself.
  await page.locator('#vml-consent [data-consent-choice="denied"]').click({ timeout: 2000 }).catch(() => {})

  // Before the clicking below, so the dropdown is read in its initial state.
  for (const problem of await page.evaluate(authoringProblems, relPath.startsWith('apps/'))) errors.push(problem)

  const buttons = page.locator('button')
  const buttonCount = await buttons.count()
  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i)
    if (await button.isVisible()) {
      await button.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(100)
      // A chart's fullscreen toggle and the Share button's modal <dialog>
      // both cover the page, so every later click would time out on the
      // actionability check (2s each) without reaching its handler. Undo
      // them the way Escape would before moving on.
      await page.evaluate(() => {
        if (document.fullscreenElement) return document.exitFullscreen()
      }).catch(() => {})
      await page.evaluate(() => {
        for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close()
      }).catch(() => {})
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

function parseArgs(argv) {
  const options = { jobs: defaultJobs, changed: false, qmdPaths: [] }
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg === '--changed') {
      options.changed = true
    } else if (arg === '--jobs') {
      const n = Number(argv[i + 1])
      if (!Number.isInteger(n) || n < 1) throw new Error(`--jobs needs a positive integer, got: ${argv[i + 1]}`)
      options.jobs = n
      i++
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      options.qmdPaths.push(arg)
    }
    i++
  }
  return options
}

// Runs `jobs` pages at a time. Each result is printed as soon as every page
// sorted before it has printed too, so the output reads in page order while
// still showing progress during the crawl.
async function crawl(browser, base, pages, jobs) {
  const results = new Map()
  let nextToStart = 0
  let nextToPrint = 0
  let anyFailure = false

  function printReady() {
    while (nextToPrint < pages.length && results.has(pages[nextToPrint])) {
      const relPath = pages[nextToPrint]
      const { errors, ms } = results.get(relPath)
      const seconds = (ms / 1000).toFixed(1)
      if (errors.length) {
        anyFailure = true
        console.log(`FAIL  ${relPath}  (${seconds}s)`)
        for (const e of errors) console.log(`      ${e}`)
      } else {
        console.log(`OK    ${relPath}  (${seconds}s)`)
      }
      nextToPrint++
    }
  }

  async function worker() {
    while (nextToStart < pages.length) {
      const relPath = pages[nextToStart]
      nextToStart++
      const started = Date.now()
      const errors = await checkPage(browser, base, relPath)
      results.set(relPath, { errors, ms: Date.now() - started })
      printReady()
    }
  }

  const workers = []
  for (let i = 0; i < jobs; i++) workers.push(worker())
  await Promise.all(workers)
  return anyFailure
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  let pages
  let scope
  if (options.qmdPaths.length > 0) {
    pages = []
    for (const arg of options.qmdPaths) pages.push(qmdArgToRelPath(arg))
    scope = ''
  } else if (options.changed) {
    pages = findChangedPages()
    if (pages === null) {
      pages = findQmdPages(repoRoot)
      scope = ' (full site, from source index.qmd files)'
    } else {
      scope = ' (changed since develop)'
    }
  } else {
    pages = findQmdPages(repoRoot)
    scope = ' (full site, from source index.qmd files)'
  }
  pages.sort()
  if (pages.length === 0) {
    console.log('No pages changed since develop; nothing to check.')
    process.exit(0)
  }
  console.log(`Checking ${pages.length} page(s)${scope}, ${options.jobs} at a time.\n`)

  console.log('Starting `quarto preview`...')
  const previewProc = await startPreview()
  console.log('Preview server ready.\n')

  const base = `http://localhost:${port}/`
  const browser = await chromium.launch()

  let anyFailure = false
  try {
    anyFailure = await crawl(browser, base, pages, options.jobs)
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
