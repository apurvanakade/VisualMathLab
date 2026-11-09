/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Checks every worked example on the page: its default statistic is what
// its data gives, its sample sizes match its data, and the p-value,
// critical values and decision the prose states are what the app shows
// (VM.distributions.hypothesisTest at alpha = 0.05).

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'
import { tests, testById, nullDistribution } from './tests.js'

const VM = loadVM()

// Each example's statistic from its raw data, by the formula index.qmd
// shows for that test.
function exampleStatistic(t) {
  const e = t.example
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = xs => Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / (xs.length - 1))
  switch (t.id) {
    case "z-mean": return (e.xbar - e.mu0) / (e.sigma / Math.sqrt(e.n))
    case "z-prop": return (e.x / e.n - e.p0) / Math.sqrt(e.p0 * (1 - e.p0) / e.n)
    case "z-2prop": {
      const p = (e.x1 + e.x2) / (e.n1 + e.n2)
      return (e.x1 / e.n1 - e.x2 / e.n2) / Math.sqrt(p * (1 - p) * (1 / e.n1 + 1 / e.n2))
    }
    case "t-one": return (e.xbar - e.mu0) / (e.s / Math.sqrt(e.n))
    case "t-paired": {
      const d = e.before.map((b, i) => b - e.after[i])
      return mean(d) / (sd(d) / Math.sqrt(d.length))
    }
    case "t-two": {
      const sp2 = ((e.n1 - 1) * e.s1 ** 2 + (e.n2 - 1) * e.s2 ** 2) / (e.n1 + e.n2 - 2)
      return (e.xbar1 - e.xbar2) / Math.sqrt(sp2 * (1 / e.n1 + 1 / e.n2))
    }
    case "chi2-gof": {
      const n = e.observed.reduce((a, b) => a + b, 0)
      return e.observed.reduce((a, o, i) => a + (o - n * e.probs[i]) ** 2 / (n * e.probs[i]), 0)
    }
    case "chi2-ind": {
      const rows = e.table.map(r => r.reduce((a, b) => a + b, 0))
      const cols = e.table[0].map((_, j) => e.table.reduce((a, r) => a + r[j], 0))
      const n = rows.reduce((a, b) => a + b, 0)
      let x2 = 0
      e.table.forEach((r, i) => r.forEach((o, j) => { const ex = rows[i] * cols[j] / n; x2 += (o - ex) ** 2 / ex }))
      return x2
    }
    case "chi2-var": return (e.n - 1) * e.s ** 2 / e.sigma0 ** 2
    case "f-var": return e.s1 ** 2 / e.s2 ** 2
  }
  return NaN
}

// What each worked example in index.qmd says: p-value (to the digits
// shown), critical value(s) and decision at alpha = 0.05.
const prose = {
  "z-mean": {p: 0.0244, critical: [-1.960, 1.960], reject: true},
  "z-prop": {p: 0.0278, critical: [-1.960, 1.960], reject: true},
  "z-2prop": {p: 0.0080, critical: [1.645], reject: true},
  "t-one": {p: 0.032, critical: [-1.753], reject: true},
  "t-paired": {p: 0.047, critical: [1.895], reject: true},
  "t-two": {p: 0.068, critical: [-2.086, 2.086], reject: false},
  "chi2-gof": {p: 0.098, critical: [11.07], reject: false},
  "chi2-ind": {p: 0.012, critical: [5.99], reject: true},
  "chi2-var": {p: 0.030, critical: [30.14], reject: true},
  "f-var": {p: 0.122, critical: [0.315, 2.963], reject: false}
}

const decimals = x => (String(x).split('.')[1] ?? '').length

test("every example's default statistic is what its data gives", () => {
  for (const t of tests) {
    const s = exampleStatistic(t)
    assert.ok(Math.abs(t.defaults.stat - s) <= 0.005, `${t.id}: default ${t.defaults.stat}, data gives ${s}`)
  }
})

test("every example's sample sizes match its data", () => {
  const e = id => testById.get(id)
  assert.equal(e("t-one").defaults.n, e("t-one").example.n)
  assert.equal(e("t-paired").defaults.n, e("t-paired").example.before.length)
  assert.equal(e("t-two").defaults.n1, e("t-two").example.n1)
  assert.equal(e("t-two").defaults.n2, e("t-two").example.n2)
  assert.equal(e("chi2-gof").defaults.k, e("chi2-gof").example.observed.length)
  assert.equal(e("chi2-ind").defaults.r, e("chi2-ind").example.table.length)
  assert.equal(e("chi2-ind").defaults.c, e("chi2-ind").example.table[0].length)
  assert.equal(e("chi2-var").defaults.n, e("chi2-var").example.n)
  assert.equal(e("f-var").defaults.n1, e("f-var").example.n1)
  assert.equal(e("f-var").defaults.n2, e("f-var").example.n2)
})

test("every example's p-value, critical values and decision match the prose", () => {
  for (const t of tests) {
    const want = prose[t.id]
    assert.ok(want, `no prose expectation for ${t.id}`)
    const dist = nullDistribution(t.kind, t.df(t.defaults))
    const r = VM.distributions.hypothesisTest(dist, exampleStatistic(t), {alternative: t.defaults.alt, alpha: 0.05})
    const half = 0.5 * 10 ** -decimals(want.p)
    assert.ok(Math.abs(r.pValue - want.p) <= half + 1e-12, `${t.id}: p = ${r.pValue}, prose says ${want.p}`)
    assert.equal(r.critical.length, want.critical.length, t.id)
    want.critical.forEach((c, i) => {
      assert.ok(Math.abs(r.critical[i] - c) <= 0.5 * 10 ** -decimals(c) + 1e-12, `${t.id}: critical ${r.critical[i]}, prose says ${c}`)
    })
    assert.equal(r.reject, want.reject, t.id)
  }
})

test("every test's default alternative is one it offers", () => {
  for (const t of tests) assert.ok(t.defaults.alt in t.alternatives, t.id)
})
