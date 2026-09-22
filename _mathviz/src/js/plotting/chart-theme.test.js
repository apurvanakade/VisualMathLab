/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

// loadVM's document stub only has addEventListener -- add just enough more
// (documentElement/body with matches(), getComputedStyle) for chart-theme.js
// to run its cssVar()/isDark() lookups without touching a real DOM. The
// style maps mirror src/css/tokens.css: the palette lives there now, so the
// stub is what stands in for the stylesheet.
const LIGHT_TOKENS = {
  '--vm-text': '#14161a', '--vm-text-soft': '#5f6672', '--vm-grid': 'rgba(3,3,3,0.08)',
  '--vm-border': 'rgba(4,4,4,0.15)', '--vm-surface': '#f6f7f9', '--vm-font-sans': 'Inter, sans-serif',
  '--vm-color-fn': '#2563eb', '--vm-color-alt': '#dc2626', '--vm-color-ok': '#16a34a',
  '--vm-color-muted': '#94a3b8', '--vm-color-ink': '#111827', '--vm-color-warn': '#f59e0b',
  '--vm-color-accent2': '#9333ea', '--vm-color-accent3': '#0d9488', '--vm-color-halo': '#ffffff'
}
const DARK_TOKENS = {
  '--vm-text': '#c9cedb', '--vm-text-soft': '#8b93a7', '--vm-grid': 'rgba(1,1,1,0.1)',
  '--vm-border': 'rgba(2,2,2,0.15)', '--vm-surface': '#1e2436', '--vm-font-sans': 'Inter, sans-serif',
  '--vm-color-fn': '#8ab4ff', '--vm-color-alt': '#f87171', '--vm-color-ok': '#4ade80',
  '--vm-color-muted': '#7d8aa3', '--vm-color-ink': '#c9cedb', '--vm-color-warn': '#fbbf24',
  '--vm-color-accent2': '#c084fc', '--vm-color-accent3': '#2dd4bf', '--vm-color-halo': '#171b29'
}

function stubDocument(dark, { tokens = true, darkSelector = 'body.quarto-dark' } = {}) {
  const styleMap = tokens ? (dark ? DARK_TOKENS : LIGHT_TOKENS) : {}
  globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => styleMap[name] ?? '' })
  // matches() stands in for the real selector engine: the body "has" the
  // quarto-dark class exactly when the test asked for dark, and nothing else.
  const matches = (selector) => dark && selector.split(',').some(s => s.trim() === darkSelector)
  globalThis.document = {
    addEventListener: () => {},
    documentElement: { matches: () => false },
    body: { matches }
  }
}

test('VM.plotting.colors returns light-mode hexes by default', () => {
  stubDocument(false)
  const VM = loadVM()
  const colors = VM.plotting.colors()
  assert.equal(colors.fn, '#2563eb')
  assert.equal(colors.alt, '#dc2626')
  assert.equal(colors.ok, '#16a34a')
})

test('VM.plotting.colors returns lightened dark-mode hexes when body.quarto-dark is set', () => {
  stubDocument(true)
  const VM = loadVM()
  const colors = VM.plotting.colors()
  assert.equal(colors.fn, '#8ab4ff')
  assert.notEqual(colors.fn, '#2563eb')
})

test('VM.plotting.colors covers every palette name with a distinct value', () => {
  stubDocument(false)
  const VM = loadVM()
  const colors = VM.plotting.colors()
  const names = ['fn', 'alt', 'ok', 'muted', 'ink', 'warn', 'accent2', 'accent3', 'halo']
  for (const name of names) assert.ok(colors[name], `missing color for ${name}`)
  assert.equal(new Set(Object.values(colors)).size, names.length, 'expected every color to be distinct')
})

test('VM.plotting.colorway excludes halo, which is a background color not a trace color', () => {
  stubDocument(false)
  const VM = loadVM()
  const colors = VM.plotting.colors()
  const colorway = VM.plotting.colorway()
  assert.ok(!colorway.includes(colors.halo), 'a trace cycled onto halo would be drawn in the background color')
  assert.ok(colorway.includes(colors.fn))
  assert.equal(colorway.length, Object.keys(colors).length - 1)
})

test('VM.plotting.colors.halo flips to the page background on the dark theme', () => {
  stubDocument(false)
  assert.equal(loadVM().plotting.colors().halo, '#ffffff')
  stubDocument(true)
  assert.equal(loadVM().plotting.colors().halo, '#171b29')
})

test('VM.plotting.themeName reports the active theme', () => {
  stubDocument(false)
  assert.equal(loadVM().plotting.themeName(), 'light')
  stubDocument(true)
  assert.equal(loadVM().plotting.themeName(), 'dark')
})

test('VM.plotting.alpha derives a translucent fill from a palette token', () => {
  stubDocument(false)
  let VM = loadVM()
  assert.equal(VM.plotting.alpha('ok', 0.2), 'rgba(22, 163, 74, 0.2)')
  // ...and follows the theme, so a fill never drifts from its own stroke
  stubDocument(true)
  VM = loadVM()
  assert.equal(VM.plotting.alpha('ok', 0.2), 'rgba(74, 222, 128, 0.2)')
})

test('VM.plotting.alpha passes a raw hex through for colors outside the palette', () => {
  stubDocument(false)
  const VM = loadVM()
  assert.equal(VM.plotting.alpha('#8b5cf6', 0.25), 'rgba(139, 92, 246, 0.25)')
})

test('VM.plotting.emptyState returns one centered paper-anchored annotation', () => {
  stubDocument(false)
  const VM = loadVM()
  const annotations = VM.plotting.emptyState('no dice')
  assert.equal(annotations.length, 1)
  assert.equal(annotations[0].text, 'no dice')
  assert.equal(annotations[0].xref, 'paper')
  assert.equal(annotations[0].yref, 'paper')
  assert.equal(annotations[0].showarrow, false)
})

test('VM.plotting.themePatch repaints colorway so uncolored traces follow a toggle', () => {
  stubDocument(true)
  const VM = loadVM()
  const patch = VM.plotting.themePatch()
  assert.deepEqual(patch.colorway, VM.plotting.colorway())
  assert.ok(patch.colorway.includes('#8ab4ff'), 'expected the dark palette after a toggle to dark')
})

test('VM.plotting.layout merges a page override on top of the shared defaults', () => {
  stubDocument(false)
  const VM = loadVM()
  const layout = VM.plotting.layout({ xaxis: { title: 'x', range: [0, 1] }, margin: { l: 10 } })
  assert.equal(layout.xaxis.title, 'x')
  assert.deepEqual(layout.xaxis.range, [0, 1])
  // Shared axis chrome the page didn't set survives the merge
  assert.equal(layout.xaxis.ticks, 'outside')
  assert.equal(layout.paper_bgcolor, 'rgba(0,0,0,0)')
  assert.equal(layout.margin.l, 10)
})

test('VM.plotting.layout with no overrides still returns a complete themed layout', () => {
  stubDocument(true)
  const VM = loadVM()
  const layout = VM.plotting.layout()
  assert.equal(layout.plot_bgcolor, 'rgba(0,0,0,0)')
  assert.equal(layout.font.color, '#c9cedb')
  assert.ok(Array.isArray(layout.colorway) && layout.colorway.length > 0)
})

test('VM.plotting.config merges onto the shared responsive/displaylogo defaults', () => {
  stubDocument(false)
  const VM = loadVM()
  assert.deepEqual(VM.plotting.config(), { responsive: true, displaylogo: false })
  assert.deepEqual(VM.plotting.config({ displaylogo: true }), { responsive: true, displaylogo: true })
})

test('VM.plotting.themePatch returns a flat dotted-path object, not nested axis objects', () => {
  stubDocument(false)
  const VM = loadVM()
  const patch = VM.plotting.themePatch()
  assert.equal(typeof patch['xaxis.gridcolor'], 'string')
  assert.equal(patch.xaxis, undefined, 'must not replace the whole xaxis object via relayout')
})

test('VM.plotting.plotOptions carries the same palette into Observable Plot color.range', () => {
  stubDocument(false)
  const VM = loadVM()
  const opts = VM.plotting.plotOptions()
  assert.deepEqual(opts.color.range, VM.plotting.colorway())
})

test('VM.plotting.colors falls back to the light palette when no stylesheet declares the tokens', () => {
  stubDocument(true, { tokens: false })
  const VM = loadVM()
  // Dark is detected, but with no --vm-color-* declared there is nothing
  // dark to read: a CDN user who skipped mathviz.css still gets a usable chart.
  assert.equal(VM.plotting.themeName(), 'dark')
  assert.equal(VM.plotting.colors().fn, '#2563eb')
})

test('the default darkSelector never matches a bare, unscoped attribute/class -- v0.1.0 regression', () => {
  // v0.1.0 shipped `[data-bs-theme="dark"]` and `.vm-dark` unscoped, which
  // (via CSS custom-property inheritance, which this stub does not model)
  // matched Quarto's own <nav data-bs-theme="dark">, set unconditionally to
  // force a dark navbar independent of the page theme -- leaking the whole
  // dark palette into the navbar on an otherwise-light page. Every clause
  // must be anchored to html or body (or the quarto-dark class, which only
  // Quarto's own light/dark toggle sets, and only on body) so a component
  // elsewhere in the page can carry the same attribute/class with no effect.
  stubDocument(false)
  const VM = loadVM()
  const clauses = VM.plotting.configure().darkSelector.split(',').map(s => s.trim())
  for (const clause of clauses) {
    assert.ok(
      clause === 'body.quarto-dark' || /^(html|body)[.\[]/.test(clause),
      `clause "${clause}" is not anchored to html/body`
    )
  }
})

test('VM.plotting.configure lets a site name its own dark selector', () => {
  stubDocument(true, { darkSelector: '.my-dark' })
  const VM = loadVM()
  assert.equal(VM.plotting.themeName(), 'light', 'the default list does not include .my-dark')
  VM.plotting.configure({ darkSelector: '.my-dark' })
  assert.equal(VM.plotting.themeName(), 'dark')
})

test('VM.plotting.layout typesets chart text in the --vm-font-sans face', () => {
  stubDocument(false)
  const VM = loadVM()
  assert.equal(VM.plotting.layout().font.family, 'Inter, sans-serif')
  assert.equal(VM.plotting.hoverLabel().font.family, 'Inter, sans-serif')
  assert.equal(VM.plotting.plotOptions().style.fontFamily, 'Inter, sans-serif')
})

test('VM.plotting.alpha accepts an rgb() value, which is what a stylesheet may resolve a token to', () => {
  stubDocument(false)
  const VM = loadVM()
  assert.equal(VM.plotting.alpha('rgb(1, 2, 3)', 0.5), 'rgba(1, 2, 3, 0.5)')
  assert.equal(VM.plotting.alpha('currentColor', 0.5), 'currentColor', 'unparseable values pass through')
})
