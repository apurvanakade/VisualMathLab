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
  const names = ['fn', 'alt', 'ok', 'muted', 'ink', 'warn', 'accent2']
  for (const name of names) assert.ok(colors[name], `missing color for ${name}`)
  assert.equal(new Set(Object.values(colors)).size, names.length, 'expected every color to be distinct')
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
  assert.deepEqual(opts.color.range, Object.values(VM.plotting.colors()))
})
