/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Drawing n items without replacement from a population of N that contains
  // K successes, P(X = k) is
  //
  //   C(K, k) C(N-K, n-k) / C(N, n)
  //
  // Support is max(0, n-(N-K)) <= k <= min(n, K): you cannot draw more
  // successes than exist, nor fewer than the draw forces on you when the
  // failures run out.
  const logChoose = (n, k) => {
    const logGamma = globalThis.VM.distributions.logGamma
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
  }

  const hypergeometricPmf = (k, N, K, n) => {
    if (!Number.isInteger(k) || k < 0) return 0
    if (k > n || k > K || n - k > N - K) return 0
    if (N < 1 || K < 0 || K > N || n < 0 || n > N) return 0
    return Math.exp(logChoose(K, k) + logChoose(N - K, n - k) - logChoose(N, n))
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, hypergeometricPmf}}
})(window)
