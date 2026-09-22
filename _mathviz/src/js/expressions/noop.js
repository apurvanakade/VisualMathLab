/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Returns its argument unchanged.
   *
   * THROWAWAY -- added only to prove that mathviz's docs-coverage test holds
   * a sync pull request red when a VM.* member arrives with no entry in
   * docs/reference/. Delete this file and its manifest entry once that is
   * confirmed; it is not part of the library's API.
   *
   * @param {*} value - Anything.
   * @returns {*} The same value.
   */
  const noop = (value) => value

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, noop}}
})(window)
