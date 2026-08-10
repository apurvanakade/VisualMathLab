/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { particleFilterStep } = VM.filters

const makeRng = (seed) => {
  const u = VM.sampling.seededRandom(seed)
  return {uniform: u, gaussian: VM.sampling.gaussianRandom(u)}
}

const uniformParticles = (n, x, y) => {
  const particles = new Array(n)
  for (let i = 0; i < n; i++) particles[i] = {x, y, vx: 0, vy: 0, weight: 1 / n}
  return particles
}

test('particleFilterStep returns as many resampled particles as it was given', () => {
  const rng = makeRng(1)
  const {particles} = particleFilterStep(rng, uniformParticles(50, 0, 0), [1, 2], {R: 10, Q: 1})
  assert.equal(particles.length, 50)
})

test('particleFilterStep resampled weights sum to 1', () => {
  const rng = makeRng(2)
  const {particles} = particleFilterStep(rng, uniformParticles(50, 0, 0), [1, 2], {R: 10, Q: 1})
  let sum = 0
  for (const p of particles) sum += p.weight
  assert.ok(Math.abs(sum - 1) < 1e-9, `expected weights to sum to 1, got ${sum}`)
})

test('particleFilterStep repeatedly fed the same stationary measurement converges its estimate near it', () => {
  const rng = makeRng(3)
  let particles = uniformParticles(200, 5, 5)
  let estimate = {x: 5, y: 5}
  for (let i = 0; i < 40; i++) {
    const step = particleFilterStep(rng, particles, [0, 0], {R: 5, Q: 0.5})
    particles = step.particles
    estimate = step.estimate
  }
  assert.ok(Math.abs(estimate.x) < 1, `x should converge near 0, got ${estimate.x}`)
  assert.ok(Math.abs(estimate.y) < 1, `y should converge near 0, got ${estimate.y}`)
})

test('particleFilterStep with a small R concentrates weight on whichever particles are already near the measurement', () => {
  // Unlike a Kalman gain, a small R can't pull particles toward a
  // measurement no existing particle is near -- it can only reweight
  // particles that are already there. So this spreads the initial cloud
  // (matching how `sim` seeds particles with a position spread, not a
  // single point) widely enough that some particles start near [3, -4].
  const rng = makeRng(4)
  const n = 500
  const particles = new Array(n)
  for (let i = 0; i < n; i++) {
    particles[i] = {x: 10 * rng.gaussian(), y: 10 * rng.gaussian(), vx: 0, vy: 0, weight: 1 / n}
  }
  const {estimate} = particleFilterStep(rng, particles, [3, -4], {R: 1, Q: 0.1})
  assert.ok(Math.abs(estimate.x - 3) < 1, `x should be near the measurement, got ${estimate.x}`)
  assert.ok(Math.abs(estimate.y - (-4)) < 1, `y should be near the measurement, got ${estimate.y}`)
})

test('particleFilterStep is deterministic for a fixed seed', () => {
  const rngA = makeRng(7)
  const rngB = makeRng(7)
  const particlesStart = uniformParticles(30, 1, 1)
  const a = particleFilterStep(rngA, particlesStart, [2, 2], {R: 4, Q: 1})
  const b = particleFilterStep(rngB, particlesStart, [2, 2], {R: 4, Q: 1})
  assert.deepEqual(a.estimate, b.estimate)
  assert.deepEqual(a.particles, b.particles)
})
