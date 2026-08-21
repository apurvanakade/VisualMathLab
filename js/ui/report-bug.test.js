/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { qmdSourcePath, buildReportBugUrl } = VM.ui

test('qmdSourcePath maps a directory-style pathname to its index.qmd source', () => {
  assert.equal(qmdSourcePath('/root-finding/newton-method/'), 'root-finding/newton-method/index.qmd')
})

test('qmdSourcePath maps an explicit index.html pathname to its .qmd source', () => {
  assert.equal(qmdSourcePath('/root-finding/newton-method/index.html'), 'root-finding/newton-method/index.qmd')
})

test('qmdSourcePath maps the site root to the homepage source', () => {
  assert.equal(qmdSourcePath('/'), 'index.qmd')
})

test('qmdSourcePath returns null for a pathname that is not a page', () => {
  assert.equal(qmdSourcePath('/js/ui/report-bug.js'), null)
})

test('buildReportBugUrl includes the page, source link, and quoted selection', () => {
  const url = buildReportBugUrl({
    pageUrl: 'https://www.visualmathlab.com/root-finding/newton-method/',
    pageTitle: 'Newton’s Method',
    sourcePath: 'root-finding/newton-method/index.qmd',
    selectedText: 'the derivative is evaluated at x0'
  })
  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://github.com/apurvanakade/VisualMathLab/issues/new')
  const body = parsed.searchParams.get('body')
  assert.match(body, /\*\*Page:\*\* https:\/\/www\.visualmathlab\.com\/root-finding\/newton-method\/\n/)
  assert.match(body, /\*\*Source:\*\* https:\/\/github\.com\/apurvanakade\/VisualMathLab\/blob\/main\/root-finding\/newton-method\/index\.qmd\n/)
  assert.match(body, /> the derivative is evaluated at x0/)
  assert.equal(parsed.searchParams.get('labels'), 'bug')
})

test('buildReportBugUrl falls back to the page title when nothing is selected', () => {
  const url = buildReportBugUrl({
    pageUrl: 'https://www.visualmathlab.com/',
    pageTitle: 'Visual Math Lab',
    sourcePath: 'index.qmd',
    selectedText: ''
  })
  const parsed = new URL(url)
  assert.equal(parsed.searchParams.get('title'), 'Bug: Visual Math Lab')
  assert.doesNotMatch(parsed.searchParams.get('body'), /Selected text/)
})

test('buildReportBugUrl truncates a long selection in the title but keeps it in full in the body', () => {
  const longText = 'x'.repeat(120)
  const url = buildReportBugUrl({
    pageUrl: 'https://www.visualmathlab.com/',
    pageTitle: 'Visual Math Lab',
    sourcePath: 'index.qmd',
    selectedText: longText
  })
  const parsed = new URL(url)
  assert.ok(parsed.searchParams.get('title').length < longText.length)
  assert.match(parsed.searchParams.get('body'), new RegExp(`> ${longText}`))
})
