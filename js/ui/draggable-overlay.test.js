/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { clampOverlayOffset, overlayStorageKey } = VM.ui

// A legend 200x120 sitting 12px in from the top-left of an 800x400 chart:
// it can move 788-200 = 588px right and 388-120 = 268px down before its far
// edge leaves the container, or 12px back the other way before its near edge
// does.
const legend = {
  offsetLeft: 12,
  offsetTop: 12,
  width: 200,
  height: 120,
  containerWidth: 800,
  containerHeight: 400
}

test('clampOverlayOffset leaves an in-bounds offset alone', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: 100, dy: 50}), {dx: 100, dy: 50})
})

test('clampOverlayOffset pins a panel dragged past the left edge', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: -500, dy: 0}), {dx: -12, dy: 0})
})

test('clampOverlayOffset pins a panel dragged past the top edge', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: 0, dy: -500}), {dx: 0, dy: -12})
})

test('clampOverlayOffset pins a panel dragged past the right edge', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: 5000, dy: 0}), {dx: 588, dy: 0})
})

test('clampOverlayOffset pins a panel dragged past the bottom edge', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: 0, dy: 5000}), {dx: 0, dy: 268})
})

test('clampOverlayOffset clamps both axes at once', () => {
  assert.deepEqual(clampOverlayOffset({...legend, dx: -900, dy: 900}), {dx: -12, dy: 268})
})

test('clampOverlayOffset keeps the near edge when the panel is wider than the chart', () => {
  // A step bar spanning wider than its container (a very narrow viewport)
  // has max < min on the x axis. It should pin to the container's left edge,
  // not return a crossed-over range.
  const wide = {...legend, width: 1000, offsetLeft: 12, containerWidth: 400}
  assert.deepEqual(clampOverlayOffset({...wide, dx: 300, dy: 0}), {dx: -12, dy: 0})
  assert.deepEqual(clampOverlayOffset({...wide, dx: -300, dy: 0}), {dx: -12, dy: 0})
})

test('clampOverlayOffset treats a flush panel as having no room to move', () => {
  const flush = {offsetLeft: 0, offsetTop: 0, width: 800, height: 400, containerWidth: 800, containerHeight: 400}
  assert.deepEqual(clampOverlayOffset({...flush, dx: 50, dy: 50}), {dx: 0, dy: 0})
})

test('overlayStorageKey is stable and distinguishes the two panels on a page', () => {
  assert.equal(
    overlayStorageKey('/apps/newton-method/', 'legend', 0),
    'vml-overlay-pos:/apps/newton-method/:legend:0'
  )
  assert.notEqual(
    overlayStorageKey('/apps/newton-method/', 'legend', 0),
    overlayStorageKey('/apps/newton-method/', 'controls', 0)
  )
  assert.notEqual(
    overlayStorageKey('/apps/newton-method/', 'legend', 0),
    overlayStorageKey('/apps/secant-method/', 'legend', 0)
  )
})
