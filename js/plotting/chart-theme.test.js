/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

// loadVM's document stub only has addEventListener -- add just enough more
// (documentElement/body with classList, getComputedStyle) for chart-theme.js
// to run its cssVar()/isDark() lookups without touching a real DOM.
function stubDocument(dark) {
  const styleMap = dark
    ? { '--vm-text': '#c9cedb', '--vm-text-soft': '#8b93a7', '--vm-grid': 'rgba(1,1,1,0.1)', '--vm-border': 'rgba(2,2,2,0.15)', '--vm-surface': '#1e2436' }
    : { '--vm-text': '#14161a', '--vm-text-soft': '#5f6672', '--vm-grid': 'rgba(3,3,3,0.08)', '--vm-border': 'rgba(4,4,4,0.15)', '--vm-surface': '#f6f7f9' }
  globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => styleMap[name] ?? '' })
  globalThis.document = {
    addEventListener: () => {},
    documentElement: {},
    body: { classList: { contains: (cls) => dark && cls === 'quarto-dark' } }
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
  const names = ['fn', 'alt', 'ok', 'muted', 'ink', 'warn', 'accent2', 'halo']
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
