/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The page's examples and the swap chain on 0/1 matrices with fixed row and
// column sums. No DOM and no OJS: the page imports from here, and
// method.test.js runs it under Node.

export const moveLabels = new Map([
  ["swap", "Checkerboard swap"],
  ["rows", "Shuffle one row"]
])

// Rows of 0s and 1s, separated by spaces. SEGREGATED is the notes'
// example: every row sum 5, column sums (4, 5, 5, 5, 6, 6, 5, 5, 5, 4) and
// 545 checkerboards, against a null mean of about 367 (SD about 7). TYPICAL
// is the state after 20,000 swaps from it. NESTED is a staircase (a Ferrers
// matrix), the only 0/1 matrix with its margins, so no swap ever applies.
const SEGREGATED = "0111110000 0000111110 1111100000 0000011111 1111100000 0000011111 1111100000 0000011111 1111100000 0000011111"
const COMMUNITIES = "1111100000 1111100000 1111100000 1111100000 1111100000 0000011111 0000011111 0000011111 0000011111 0000011111"
const NESTED = "1111111111 1111111110 1111111000 1111110000 1111100000 1111100000 1111000000 1100000000 1000000000 1000000000"
const TYPICAL = "0001111100 0010011101 0001010111 1110010100 1101001010 0110101001 1000110101 1110100010 0011110010 0101101010"

export const examples = [
  {title: "A segregated matrix", params: {matrix: SEGREGATED, move: "swap"}},
  {title: "Shuffling rows instead", params: {matrix: SEGREGATED, move: "rows"}},
  {title: "Two separate communities", params: {matrix: COMMUNITIES, move: "swap"}},
  {title: "A typical matrix: nothing to burn in", params: {matrix: TYPICAL, move: "swap"}},
  {title: "A nested matrix: the chain can't move", params: {matrix: NESTED, move: "swap"}}
]

/**
 * Rows of 0s and 1s separated by spaces, commas or semicolons, all the same
 * length, 2 to 20 of each.
 *
 * @returns {{rows: number, cols: number, cells: Uint8Array}|null}
 */
export function parseMatrix (text) {
  const rows = String(text).trim().split(/[\s,;]+/).filter(s => s !== "")
  if (rows.length < 2 || rows.length > 20) return null
  const cols = rows[0].length
  if (cols < 2 || cols > 20) return null
  const cells = new Uint8Array(rows.length * cols)
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== cols || !/^[01]+$/.test(rows[i])) return null
    for (let j = 0; j < cols; j++) cells[i * cols + j] = rows[i][j] === "1" ? 1 : 0
  }
  return {rows: rows.length, cols, cells}
}

export function formatMatrix ({rows, cols, cells}) {
  const out = []
  for (let i = 0; i < rows; i++) out.push(Array.from(cells.subarray(i * cols, (i + 1) * cols)).join(""))
  return out.join(" ")
}

export function rowSums ({rows, cols, cells}) {
  return Array.from({length: rows}, (_, i) => {
    let s = 0
    for (let j = 0; j < cols; j++) s += cells[i * cols + j]
    return s
  })
}

export function colSums ({rows, cols, cells}) {
  return Array.from({length: cols}, (_, j) => {
    let s = 0
    for (let i = 0; i < rows; i++) s += cells[i * cols + j]
    return s
  })
}

// The number of 2x2 checkerboards: pairs of rows i < j and columns a, b
// with row i holding a but not b and row j holding b but not a. For one
// pair of rows that is (# columns only i has) x (# columns only j has).
export function checkerboards ({rows, cols, cells}) {
  let total = 0
  for (let i = 0; i < rows; i++) {
    for (let j = i + 1; j < rows; j++) {
      let onlyI = 0, onlyJ = 0
      for (let c = 0; c < cols; c++) {
        const x = cells[i * cols + c], y = cells[j * cols + c]
        if (x && !y) onlyI++
        else if (y && !x) onlyJ++
      }
      total += onlyI * onlyJ
    }
  }
  return total
}

/**
 * K steps of the chain from `start`.
 *
 * - "swap": pick two rows and two columns; if their four cells form a
 *   checkerboard, flip it. Every row and column sum stays put.
 * - "rows": shuffle one random row. Row sums stay put; column sums drift.
 *
 * @returns {{states: Uint8Array, counts: Int32Array, picks: Int16Array,
 *   flipped: Uint8Array, rows, cols}} where state t (t = 0..K) is
 *   `states[t*rows*cols ...]`, `counts[t]` its checkerboards, and step t
 *   (1..K) picked rows/columns `picks[4*(t-1) ...]` = [i, j, a, b] (for
 *   "rows", [i, -1, -1, -1]) and `flipped[t-1]` says whether it changed
 *   anything.
 */
export function runChain (start, {K, move = "swap", rng}) {
  const {rows, cols} = start
  const size = rows * cols
  const states = new Uint8Array((K + 1) * size)
  const counts = new Int32Array(K + 1)
  const picks = new Int16Array(4 * K)
  const flipped = new Uint8Array(K)
  const m = Uint8Array.from(start.cells)
  const view = {rows, cols, cells: m}
  states.set(m, 0)
  counts[0] = checkerboards(view)

  const pickTwo = (n) => {
    const x = Math.floor(rng() * n)
    let y = Math.floor(rng() * (n - 1))
    if (y >= x) y++
    return [x, y]
  }

  for (let t = 1; t <= K; t++) {
    let changed = false
    if (move === "swap") {
      const [i, j] = pickTwo(rows)
      const [a, b] = pickTwo(cols)
      picks.set([i, j, a, b], 4 * (t - 1))
      const ia = m[i * cols + a], ib = m[i * cols + b], ja = m[j * cols + a], jb = m[j * cols + b]
      if (ia === jb && ib === ja && ia !== ib) {
        m[i * cols + a] = ib; m[i * cols + b] = ia
        m[j * cols + a] = jb; m[j * cols + b] = ja
        changed = true
      }
    } else {
      const i = Math.floor(rng() * rows)
      picks.set([i, -1, -1, -1], 4 * (t - 1))
      const before = m.slice(i * cols, (i + 1) * cols)
      for (let c = cols - 1; c > 0; c--) {
        const d = Math.floor(rng() * (c + 1))
        const tmp = m[i * cols + c]; m[i * cols + c] = m[i * cols + d]; m[i * cols + d] = tmp
      }
      for (let c = 0; c < cols; c++) if (m[i * cols + c] !== before[c]) changed = true
    }
    flipped[t - 1] = changed ? 1 : 0
    states.set(m, t * size)
    counts[t] = changed ? checkerboards(view) : counts[t - 1]
  }
  return {states, counts, picks, flipped, rows, cols}
}

// State t of a run, as a matrix.
export function stateAt (run, t) {
  const size = run.rows * run.cols
  return {rows: run.rows, cols: run.cols, cells: run.states.subarray(t * size, (t + 1) * size)}
}
