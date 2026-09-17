/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Bins raw samples into `binCount` equal-width bins, normalizing counts
  // into densities (dividing by sample count and bin width) so the total
  // area is ~1 -- directly comparable to an overlaid theoretical PDF/PMF
  // curve on the same chart. By default the range spans the samples'
  // own min/max; pass an explicit {lo, hi} to align bins to a fixed
  // range instead -- e.g. one bin per integer value, centered exactly on
  // each integer (range {lo: min - 0.5, hi: max + 0.5}, binCount = max -
  // min + 1), which auto-ranging can't guarantee since (max - min) rarely
  // divides evenly into whole-integer-width bins.
  const histogramBins = (samples, binCount, range) => {
    if (samples.length === 0 || binCount < 1) return {edges: [], centers: [], densities: []}

    let lo, hi
    if (range) {
      lo = range.lo
      hi = range.hi
    } else {
      lo = Infinity
      hi = -Infinity
      for (const s of samples) {
        if (s < lo) lo = s
        if (s > hi) hi = s
      }
    }
    if (lo === hi) { lo -= 0.5; hi += 0.5 }

    const width = (hi - lo) / binCount
    const counts = new Array(binCount).fill(0)
    for (const s of samples) {
      let index = Math.floor((s - lo) / width)
      if (index < 0) index = 0
      if (index >= binCount) index = binCount - 1
      counts[index]++
    }

    const edges = []
    for (let i = 0; i <= binCount; i++) edges.push(lo + i * width)

    const centers = []
    const densities = []
    for (let i = 0; i < binCount; i++) {
      centers.push(lo + (i + 0.5) * width)
      densities.push(counts[i] / (samples.length * width))
    }

    return {edges, centers, densities}
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, histogramBins}}
})(window)
