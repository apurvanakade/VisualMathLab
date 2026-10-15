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
const settleTimeoutMs = 1500
const defaultJobs = 4

const skipDirs = new Set(['docs', 'node_modules', '.quarto', '.git', '_freeze'])

// Anything under these paths lands in every rendered page (the extension's
// <head> tags, the includes, the theme, the sidebar), so a change there
// cannot be verified by loading only the pages whose source changed.
const siteWidePaths = ['_extensions/', '_includes/', '_quarto.yml']

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
      if (file === 'index.qmd') pages.add('index.html')
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
// (an Observable Inputs upgrade, a new wrapper, a refactor of mathviz's CSS).
// Runs in the page. Shared by the desktop pass (checkSliderControls) and the
// phone pass (checkPhoneLayout), so both hold every track to one standard.
function sliderTrackProblems() {
  // Both thresholds are derived from a measurement of all 24 sliders on the
  // site at the desktop pass's viewport, not picked by feel:
  //   narrowest legitimate track: 147px, at 49% of its form
  //     (apps/positive-predictive-value, three sliders sharing a panel grid row)
  //   widest: 706px at 80% (the root-finding step sliders)
  //   the regressions being guarded against measured 0px, and 35px in a
  //     ~250px form -- i.e. 14% of it
  // So each floor sits roughly a third below the narrowest real value and
  // far above both failures. Re-measure rather than lower a threshold if a
  // legitimately narrower control is ever added. At a phone's 390px the
  // narrowest is 157px at 50% (the Sperner pages' subdivision slider, whose
  // label takes a line of its own in a bar that narrow), inside both floors.
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
}

// Runs in the page. A slider sits above the chart it drives (CLAUDE.md,
// "Chart controls"), never under it: under a chart it is the first thing
// pushed out of view, by the window's edge or by a split page's app pane,
// which is fitted to the window. So inside each .ojs-chart-block every
// visible slider must start above the block's Plotly chart.
function slidersBelowChart() {
  const bad = []
  for (const block of document.querySelectorAll('.ojs-chart-block')) {
    const chart = block.querySelector('.js-plotly-plot')
    if (!chart || chart.offsetParent === null) continue
    const chartTop = chart.getBoundingClientRect().top
    for (const input of block.querySelectorAll('input[type="range"]')) {
      if (input.offsetParent === null) continue
      if (input.getBoundingClientRect().top >= chartTop) {
        const label = (input.closest('form')?.querySelector('label')?.textContent || '?').trim()
        bad.push(`slider "${label}" sits below the chart it drives`)
      }
    }
  }
  return bad
}

async function checkSliderControls(page, errors) {
  for (const problem of await page.evaluate(sliderTrackProblems)) errors.push(`layout: ${problem}`)
  for (const problem of await page.evaluate(slidersBelowChart)) errors.push(`layout: ${problem}`)

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

// Share dialog (CLAUDE.md, "Embed mode"): mathviz's share.js button opens a
// <dialog> that writes the ?embed= <iframe> snippet embed.qmd documents.
// Runs before the generic button-mashing loop below, for the same reason
// checkSliderControls does -- it asserts the dialog's actual content, which
// the blind click-everything loop never inspects. Clipboard permission is
// granted up front so the Copy button's real navigator.clipboard.writeText
// path is exercised rather than always falling back to textarea.select().
async function checkShareDialog(page, errors) {
  const button = page.locator('.vm-share-button').first()
  if ((await button.count()) === 0) return

  await button.click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)

  const problem = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.vm-share-dialog')
    if (!dialog || !dialog.open) return 'share button did not open the dialog'
    // An accessible name: without one a screen reader announces a bare
    // "dialog" and the reader can't tell what opened.
    const labelledBy = dialog.getAttribute('aria-labelledby')
    const label = labelledBy ? document.getElementById(labelledBy) : null
    if (!label || !label.textContent.trim()) return 'share dialog has no accessible name (aria-labelledby)'
    const code = dialog.querySelector('.vm-share-code')
    if (!code) return 'share dialog has no snippet textarea'
    const snippet = code.value
    if (!snippet.includes('<iframe')) return `share snippet is missing <iframe: ${snippet}`
    if (!snippet.includes('embed=')) return `share snippet is missing embed=: ${snippet}`
    if (!snippet.includes('https://www.visualmathlab.com')) return `share snippet does not point at the public site: ${snippet}`
    const withInputs = dialog.querySelector('.vm-share-link-inputs')
    const plain = dialog.querySelector('.vm-share-link-plain')
    if (!withInputs || !plain) return 'share dialog is missing a page link'
    for (const link of [withInputs, plain]) {
      if (!link.href.startsWith('https://www.visualmathlab.com/')) return `share link does not point at the public site: ${link.href}`
      if (link.href.includes('embed=')) return `share link carries embed=: ${link.href}`
    }
    if (plain.href.includes('?')) return `share link without inputs still has a query string: ${plain.href}`
    return null
  })
  if (problem) errors.push(`share: ${problem}`)

  await page.locator('.vm-share-copy').click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(100)
  const copyLabel = await page.locator('.vm-share-copy').textContent().catch(() => '')
  if (!/Copied|Press/.test(copyLabel ?? '')) {
    errors.push(`share: Copy button gave no feedback after click (label: "${copyLabel}")`)
  }

  // Leave the dialog closed so it doesn't shadow the generic button loop
  // below, whose own actionability checks would otherwise time out (2s
  // each) on every button behind the modal until something closes it.
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close()
  }).catch(() => {})
}

// Embed mode (CLAUDE.md, "Embed mode"): ?embed=1 must show the page's tagged
// app and nothing else in the content column, and ?embed=<id> must show the
// block with that id. Rendered-outcome assertions, like checkSliderControls:
// a page that forgot its <div class="vm-app"> renders fine and throws
// nothing, it just embeds as the whole page. Everything in
// #quarto-document-content that is neither the active .vm-app, inside it nor
// an ancestor of it must lay out to zero height; only app pages are checked,
// since the tag is an app-page convention (a listing or the privacy page has
// no app to show).
function embedProblems(expectedId) {
  const main = document.getElementById('quarto-document-content')
  if (!main) return ['no #quarto-document-content']
  const problems = []
  const apps = main.querySelectorAll('.vm-app')
  if (apps.length === 0) problems.push('no .vm-app block on the page (wrap the app in <div class="vm-app">)')
  let active = null
  for (const app of apps) {
    if (app.classList.contains('vm-app-active')) active = app
  }
  if (active === null) {
    problems.push('no .vm-app-active block')
    return problems
  }
  if (expectedId !== null && active.id !== expectedId) {
    problems.push(`active .vm-app is #${active.id || '(no id)'}, expected #${expectedId}`)
  }
  if (active.getBoundingClientRect().height === 0) problems.push('the active .vm-app has zero height')
  for (const el of main.querySelectorAll('*')) {
    if (el === active || active.contains(el) || el.contains(active)) continue
    if (el.getBoundingClientRect().height > 0) {
      const label = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').join('.') : '')
      problems.push(`non-app content visible in embed mode: ${label}`)
    }
  }
  return problems
}

// True once no OJS cell is still evaluating and, on an app page, its app has
// drawn something. Quarto's `ojs-in-a-box-waiting-for-module-import` class is
// not the marker to watch: it is only ever cleared when the page's OJS module
// has `import`s (none here does), so it stays on every cell forever. The
// Observable inspector's `--running` class is, with one exception: a
// declaration cell (`function f() {}`) never gets its inspector fulfilled,
// so it reports running for the life of the page.
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
  // Untypeset math is raw TeX, which a nowrap span can stretch far past a
  // phone's width (particle-filter's 789px reweight line), so a layout check
  // run before MathJax finishes measures a page no reader sees.
  for (const el of document.querySelectorAll('span.math')) {
    if (!el.querySelector('mjx-container')) return false
  }
  return true
}

// In practice every page is settled by the time `networkidle` fires, so this
// costs one poll; the timeout is the ceiling for a page that never is, which
// then gets exactly the fixed wait it got before.
async function waitForSettle(page, relPath) {
  const isApp = relPath.startsWith('apps/')
  await page.waitForFunction(isSettled, isApp, { timeout: settleTimeoutMs, polling: 50 }).catch(() => {})
}

// "Try an example" dropdown (CLAUDE.md, "URL-shareable inputs and example
// presets"): it must name the example the fields hold -- on load, after a
// pick, and again once an edit is undone -- and read "Custom inputs" only
// while they match no example. Runs against the real Inputs.select, which
// the stubbed unit tests in apply-example.test.js can't reach.
async function checkExampleDropdown(page, errors) {
  const select = page.locator('.vm-app form:has-text("Try an example") select').first()
  if ((await select.count()) === 0) return
  const state = () => select.evaluate(s => ({
    label: s.options[s.selectedIndex].textContent,
    custom: {disabled: s.options[0].disabled, hidden: s.options[0].hidden},
    first: s.options[1] ? s.options[1].textContent : null,
    count: s.options.length
  }))

  const onLoad = await state()
  if (onLoad.label === 'Custom inputs') {
    errors.push('example dropdown: page opens on "Custom inputs" -- its default inputs match no example')
  } else if (onLoad.label !== onLoad.first) {
    errors.push(`example dropdown: page opens on "${onLoad.label}", not the first example "${onLoad.first}" -- ` +
                'put the example matching the default inputs first')
  }
  if (!onLoad.custom.disabled || !onLoad.custom.hidden) {
    errors.push('example dropdown: "Custom inputs" option is pickable (not disabled and hidden)')
  }
  if (onLoad.count < 3) return

  // Pick an example other than the current one; applyExampleParams waits
  // 100 ms per field, so give it time to finish.
  let pickIndex = 1
  if (onLoad.label === (await select.evaluate(s => s.options[1].textContent))) pickIndex = 2
  const picked = await select.evaluate((s, i) => s.options[i].textContent, pickIndex)
  await select.selectOption({index: pickIndex})
  await page.waitForTimeout(1500)
  const afterPick = await state()
  if (afterPick.label !== picked) {
    errors.push(`example dropdown: picked "${picked}" but it reads "${afterPick.label}"`)
  }

  const field = page.locator('.vm-app [data-example-field] input[type=text]').first()
  if ((await field.count()) === 0) return
  const original = await field.inputValue()
  await field.fill(original + '+0')
  await page.waitForTimeout(300)
  const afterEdit = await state()
  if (afterEdit.label !== 'Custom inputs') {
    errors.push(`example dropdown: an edited field still reads "${afterEdit.label}", not "Custom inputs"`)
  }
  await field.fill(original)
  await page.waitForTimeout(300)
  const afterUndo = await state()
  if (afterUndo.label !== picked) {
    errors.push(`example dropdown: undoing the edit reads "${afterUndo.label}", not "${picked}"`)
  }
}

// The giscus comment frame (_includes/giscus.html) on every app page is
// blocked rather than loaded from the live giscus.app: a page with no
// discussion yet makes the real widget log 404s, and the crawl shouldn't hinge
// on a third party anyway. Blocked through CDP, not page.route: routing turns
// off the HTTP cache for the whole page, so every page re-downloaded Plotly,
// math.js and MathJax, and the slowest (particle-filter) was measured before
// it settled. (The cross-origin frame's own document request may still go
// out, but everything it loads is blocked, so the widget never runs.) Any
// console error or failed request from giscus.app is ignored via isGiscus. Returns the giscus URLs the page asked for, so embed mode can
// assert it never asked.
function isGiscus(url) {
  return typeof url === 'string' && url.startsWith('https://giscus.app/')
}

async function blockGiscus(page) {
  const hits = []
  page.on('request', req => {
    if (isGiscus(req.url())) hits.push(req.url())
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setBlockedURLs', { urls: ['https://giscus.app/*'] })
  return hits
}

// The same page at a phone's width (390x844, an iPhone 14). The desktop pass
// above runs at Playwright's default 1280x720, which never caught slider
// tracks squeezed to 0-98px on a phone (fixed in mathviz v0.3.0) or a table
// of equations that made the spirograph page scroll sideways.
async function checkPhoneLayout(browser, base, relPath, errors) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await blockGiscus(page)
  page.on('pageerror', err => errors.push(`phone pageerror: ${err.message}`))
  try {
    await page.goto(base + relPath, { waitUntil: 'networkidle', timeout: 30000 })
    await waitForSettle(page, relPath)
    for (const problem of await page.evaluate(sliderTrackProblems)) errors.push(`phone layout: ${problem}`)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    if (scrollWidth > 390) errors.push(`phone layout: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  } finally {
    await page.close()
  }
}

async function checkEmbedMode(browser, base, relPath, errors) {
  const page = await browser.newPage()
  const giscusHits = await blockGiscus(page)
  page.on('pageerror', err => errors.push(`embed pageerror: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`embed console.error: ${msg.text()}`)
  })
  try {
    await page.goto(`${base}${relPath}?embed=1`, { waitUntil: 'networkidle', timeout: 30000 })
    await waitForSettle(page, relPath)
    if (!(await page.evaluate(() => document.documentElement.classList.contains('vm-embed')))) {
      errors.push('embed: html.vm-embed not set')
    }
    for (const problem of await page.evaluate(embedProblems, null)) errors.push(`embed=1: ${problem}`)

    // Every id-tagged block must be selectable on its own.
    const ids = await page.evaluate(() => {
      const found = []
      for (const app of document.querySelectorAll('#quarto-document-content .vm-app[id]')) found.push(app.id)
      return found
    })
    for (const id of ids) {
      await page.goto(`${base}${relPath}?embed=${encodeURIComponent(id)}`, { waitUntil: 'networkidle', timeout: 30000 })
      await waitForSettle(page, relPath)
      for (const problem of await page.evaluate(embedProblems, id)) errors.push(`embed=${id}: ${problem}`)
    }
    // An embedded app shows no comments and contacts giscus.app not at all
    // (privacy.qmd says so). The frame is lazy, so bring the page's end into
    // view first, where the comment section would be.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    if (await page.evaluate(() => document.querySelector('.vml-comments') !== null)) errors.push('embed: the giscus comment section is on the page')
    if (giscusHits.length > 0) errors.push(`embed: requested ${giscusHits[0]}`)
  } finally {
    await page.close()
  }
}

async function checkPage(browser, base, relPath) {
  const page = await browser.newPage()
  await blockGiscus(page)
  // Grants the Share dialog's Copy button its real navigator.clipboard.
  // writeText path instead of always hitting the textarea.select() fallback
  // -- harmless for every other page, which never calls the clipboard API.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin }).catch(() => {})
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
  // has. It is fixed to the bottom of the window, and on a split page so is
  // the app pane: scrolling the page doesn't move the pane's controls out
  // from under it, so a click on a slider's playback caret there landed on
  // the banner instead. Clicking its real button keeps that path in the
  // crawl; npm run verify:analytics tests the banner itself.
  await page.locator('#vml-consent [data-consent-choice="denied"]').click({ timeout: 2000 }).catch(() => {})

  // Layout/content assertions run before the generic button-mashing below,
  // so they see each page's initial render rather than whatever state
  // clicking everything leaves behind.
  await checkSliderControls(page, errors)
  await checkShareDialog(page, errors)
  await checkExampleDropdown(page, errors)

  const buttons = page.locator('button')
  const buttonCount = await buttons.count()
  for (let i = 0; i < buttonCount; i++) {
    const button = buttons.nth(i)
    if (await button.isVisible()) {
      await button.click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(100)
      // A chart's fullscreen toggle leaves its block covering the page, so
      // every later click would time out on the actionability check (2s
      // each) without ever reaching its handler. Leave fullscreen the way
      // Escape would before moving on. The Share button (re-clicked here
      // like any other button, since this loop doesn't know about it)
      // opens a modal <dialog> with the same problem -- close it too.
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

  await checkPhoneLayout(browser, base, relPath, errors)
  if (relPath.startsWith('apps/')) await checkEmbedMode(browser, base, relPath, errors)
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
