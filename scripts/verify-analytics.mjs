/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Tier 2 (real browser) test of the analytics consent flow described in
// CLAUDE.md's "Analytics and consent" section: _includes/analytics.html (the
// GA4 snippet) gated by _includes/consent.html (the banner). Complements
// scripts/analytics.test.js, which covers the same files' pure logic without
// a browser -- what that file *cannot* cover is the gate itself, since a
// `type="text/plain"` script only fails to execute inside an actual browser,
// not in a stubbed `new Function` sandbox.
//
// Unlike scripts/verify-pages.mjs (which drives `quarto preview` on
// localhost), this script serves the already-rendered docs/ directory itself
// and maps a real-looking hostname onto it via Chromium's
// --host-resolver-rules. That is not a style choice: analytics.html
// deliberately refuses to run on `localhost`/`127.0.0.1` so `quarto preview`
// sessions don't pollute the GA property (see that file's header comment),
// so testing that it *does* run requires a non-localhost hostname pointed at
// the exact same static files. All requests to google-analytics.com are
// intercepted and aborted -- nothing this script does ever reaches the real
// GA property.
//
// Requires docs/ to already be rendered (`quarto render` or `npm run
// verify`, which renders first) -- this script does not render on its own,
// since it is meant to be fast to re-run while iterating on consent.html.
//
// Usage: node scripts/verify-analytics.mjs (or: npm run verify:analytics)

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const docsRoot = path.join(repoRoot, 'docs')
const port = 8934
const host = 'www.visualmathlab.com'
const measurementId = 'G-76ZBFD9S9B'

const mimeTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0])
    if (reqPath.endsWith('/')) reqPath += 'index.html'
    const filePath = path.join(docsRoot, reqPath)
    fs.readFile(filePath, (err, body) => {
      if (err) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { 'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' })
      res.end(body)
    })
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}

let failures = 0
function check(label, actual, expected) {
  const ok = String(actual) === String(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : `   (expected ${expected})`}`)
}

function instrument(page, hits, errors) {
  page.route('**://*.google-analytics.com/**', (route) => {
    hits.push(route.request().url())
    route.abort()
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(msg.text())) errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))
}

async function newSession(browser, { privacySignal = null } = {}) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  if (privacySignal === 'dnt') {
    await page.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }))
  }
  if (privacySignal === 'gpc') {
    await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }))
  }
  return { ctx, page }
}

async function analyticsState(page) {
  return page.evaluate(() => ({
    ls: Object.keys(localStorage),
    gated: document.querySelectorAll('script[type="text/plain"][data-consent="analytics"]').length,
  }))
}

async function main() {
  if (!fs.existsSync(path.join(docsRoot, 'index.html'))) {
    console.error('docs/ is not rendered yet. Run `quarto render` (or `npm run verify`) first.')
    process.exit(1)
  }

  const server = await startStaticServer()
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP ${host}:${port} 127.0.0.1:${port}`],
  })
  const base = `http://${host}:${port}`

  try {
    console.log('--- 1. fresh visit: banner shown, nothing measured, no cookies ---')
    {
      const { ctx, page } = await newSession(browser)
      const hits = [], errors = []
      instrument(page, hits, errors)
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      check('banner visible', await page.locator('#vml-consent').isVisible(), true)
      check('GA requests', hits.length, 0)
      const st = await analyticsState(page)
      check('gated script still inert', st.gated, 1)
      check('no analytics id stored', st.ls.includes('cid_v4'), false)
      check('cookies set', (await ctx.cookies()).length, 0)
      check('console errors', errors.length, 0)
      await ctx.close()
    }

    console.log('\n--- 2. Allow: exactly one page_view, correct params, no cookies ---')
    {
      const { ctx, page } = await newSession(browser)
      const hits = [], errors = []
      instrument(page, hits, errors)
      // Query string exercises the "dl drops the query string" local patch,
      // using a page whose "?s=" genuinely means something other than search.
      await page.goto(`${base}/apps/butcher-tableau/index.html?s=4`, { waitUntil: 'networkidle' })
      check('GA requests before allowing', hits.length, 0)
      await page.click('[data-consent-choice="granted"]')
      await page.waitForTimeout(500)
      check('banner dismissed', await page.locator('#vml-consent').isVisible(), false)
      check('GA requests after allowing', hits.length, 1)
      const q = new URLSearchParams(new URL(hits[0]).search)
      check('tid', q.get('tid'), measurementId)
      check('event', q.get('en'), 'page_view')
      check('dl has no query string', q.get('dl'), `${base}/apps/butcher-tableau/index.html`)
      check('search_term not sent', q.get('ep.search_term'), 'null')
      check('cookies set', (await ctx.cookies()).length, 0)
      check('console errors', errors.length, 0)
      // Choice persists across navigation: no second banner, measurement continues.
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      check('no banner on next page', await page.locator('#vml-consent').isVisible(), false)
      check('measurement continues on next page', hits.length >= 2, true)
      await ctx.close()
    }

    console.log('\n--- 3. No thanks: nothing sent, not asked again ---')
    {
      const { ctx, page } = await newSession(browser)
      const hits = [], errors = []
      instrument(page, hits, errors)
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      await page.click('[data-consent-choice="denied"]')
      await page.waitForTimeout(500)
      check('GA requests', hits.length, 0)
      check('no analytics id stored', (await analyticsState(page)).ls.includes('cid_v4'), false)
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      check('not asked again', await page.locator('#vml-consent').isVisible(), false)
      check('still no GA requests', hits.length, 0)
      check('console errors', errors.length, 0)
      await ctx.close()
    }

    console.log('\n--- 4. footer link reopens the banner, and withdrawal actually stops measurement ---')
    {
      const { ctx, page } = await newSession(browser)
      const hits = [], errors = []
      instrument(page, hits, errors)
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      await page.click('[data-consent-choice="granted"]')
      await page.waitForTimeout(400)
      check('measuring after allow', hits.length, 1)
      await page.click('a[href$="#analytics-preferences"]')
      await page.waitForTimeout(300)
      check('banner reopened', await page.locator('#vml-consent').isVisible(), true)
      check('shows current setting', await page.locator('#vml-consent-status').innerText(), 'Analytics is currently allowed.')
      const before = hits.length
      await page.click('[data-consent-choice="denied"]')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      check('identifier deleted on withdrawal', (await analyticsState(page)).ls.includes('cid_v4'), false)
      check('no new GA requests after withdrawing', hits.length, before)
      check('console errors', errors.length, 0)
      await ctx.close()
    }

    for (const signal of ['dnt', 'gpc']) {
      console.log(`\n--- 5. ${signal.toUpperCase()} signal: treated as an answer already given ---`)
      const { ctx, page } = await newSession(browser, { privacySignal: signal })
      const hits = [], errors = []
      instrument(page, hits, errors)
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      check('not asked', await page.locator('#vml-consent').isVisible(), false)
      check('GA requests', hits.length, 0)
      await page.click('a[href$="#analytics-preferences"]')
      await page.waitForTimeout(200)
      check('can still open preferences deliberately', await page.locator('#vml-consent').isVisible(), true)
      // The snippet returns early on either signal, so a recorded "yes" would
      // measure nothing; the banner says so and disables Allow rather than
      // pretending (see consent.html's show()).
      check('Allow is disabled', await page.locator('[data-consent-choice="granted"]').isDisabled(), true)
      check('status explains why', /Do Not Track or Global Privacy Control/.test(await page.locator('#vml-consent-status').innerText()), true)
      await page.evaluate(() => document.querySelector('[data-consent-choice="granted"]').click())
      await page.waitForTimeout(400)
      check('still not measured (browser signal wins)', hits.length, 0)
      check('console errors', errors.length, 0)
      await ctx.close()
    }

    console.log('\n--- 6. referrer policy precedes every cross-origin script in the rendered <head> ---')
    {
      // The meta is emitted by the mathviz extension (mathviz.referrer in
      // _quarto.yml), which also adds the math.js/Plotly CDN tags -- ahead of
      // include-in-header, which is why the meta can't live there any more.
      // This is the claim privacy.qmd makes ("no other origin sees the
      // page"); the structural test only checks the option is set.
      const html = fs.readFileSync(path.join(docsRoot, 'apps/newton-method/index.html'), 'utf8')
      const head = html.slice(0, html.indexOf('</head>'))
      const metaAt = head.indexOf('<meta name="referrer" content="same-origin">')
      const firstCdn = head.search(/<script[^>]+src="https:\/\//)
      check('meta present in <head>', metaAt >= 0, true)
      check('meta before first CDN script', metaAt >= 0 && firstCdn > metaAt, true)
      const { ctx, page } = await newSession(browser)
      await page.goto(`${base}/apps/newton-method/`, { waitUntil: 'networkidle' })
      check('document.referrer policy applied', await page.evaluate(() => document.querySelector('meta[name=referrer]')?.content), 'same-origin')
      await ctx.close()
    }

    console.log('\n--- 7. embed mode (?embed=1): no banner, nothing measured, even after a prior Allow ---')
    {
      const { ctx, page } = await newSession(browser)
      const hits = [], errors = []
      instrument(page, hits, errors)
      // Grant first, on a normal page, so the stored "yes" exists...
      await page.goto(`${base}/privacy.html`, { waitUntil: 'networkidle' })
      await page.click('[data-consent-choice="granted"]')
      await page.waitForTimeout(400)
      check('measured after Allow (sanity)', hits.length >= 1, true)
      // ...then load an app framed-style: the stored yes must not measure.
      await page.goto(`${base}/apps/newton-method/?embed=1&f=x%5E3-2`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      check('html.vm-embed set', await page.evaluate(() => document.documentElement.classList.contains('vm-embed')), true)
      check('banner hidden', await page.locator('#vml-consent').isVisible(), false)
      check('navbar hidden', await page.locator('#quarto-header').isVisible(), false)
      // The privacy page itself sends a user_engagement beacon as it is left
      // (visibilitychange -> hidden), so count by the page each hit reports.
      const fromEmbed = hits.filter((u) => /dl=[^&]*newton-method/.test(u))
      check('no GA request from the embedded page', fromEmbed.length, 0)
      check('console errors', errors.length, 0)
      await ctx.close()
    }
  } finally {
    await browser.close()
    server.close()
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} CHECK(S) FAILED.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
