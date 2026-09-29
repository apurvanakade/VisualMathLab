/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Every input on an app is URL-shareable: its default is read from the
  // query string, and a sync cell writes the current value back with
  // history.replaceState, so the address bar is always a link to what the
  // reader sees. Two things make that awkward on a lecture-notes page
  // rather than a one-app page: several apps share one query string (so
  // their keys carry a prefix), and a reader who never touches an app
  // shouldn't find ?pi_n=1000&pi_seed=1 appended to the chapter's URL.
  // syncUrlParams therefore drops any key whose value equals its default.

  /**
   * Reads one query-string parameter from the current URL, typed like its
   * fallback.
   *
   * @param {string} key
   * @param {(number|string|boolean)} fallback - Returned when the key is
   *   absent or doesn't parse. A number fallback parses the value with
   *   `Number` (non-finite results fall back); a boolean fallback accepts
   *   `"1"`/`"true"` and `"0"`/`"false"`; a string fallback returns the raw
   *   value.
   * @param {Object} [opts]
   * @param {string} [opts.search=location.search] - The query string to read.
   * @returns {(number|string|boolean)}
   */
  const urlParam = (key, fallback, opts = {}) => {
    const search = opts.search ?? globalThis.location.search
    const raw = new URLSearchParams(search).get(key)
    if (raw === null) return fallback
    if (typeof fallback === "number") {
      const value = Number(raw)
      if (raw.trim() === "" || !Number.isFinite(value)) return fallback
      return value
    }
    if (typeof fallback === "boolean") {
      if (raw === "1" || raw === "true") return true
      if (raw === "0" || raw === "false") return false
      return fallback
    }
    return raw
  }

  /**
   * Writes the given inputs into the current URL's query string with
   * `history.replaceState` (no navigation, no history entry), leaving
   * every other key -- another app's, or mathviz's `embed` -- alone.
   *
   * @param {Object<string, [*, *]>} entries - `{key: [value, default]}`. A
   *   key whose value equals its default (compared as strings) is removed
   *   rather than written.
   * @param {Object} [opts]
   * @param {string} [opts.search=location.search]
   * @returns {string} The new query string, without the leading `?` (`""`
   *   when nothing is left).
   */
  const syncUrlParams = (entries, opts = {}) => {
    const search = opts.search ?? globalThis.location.search
    const params = new URLSearchParams(search)
    for (const key of Object.keys(entries)) {
      const [value, fallback] = entries[key]
      if (String(value) === String(fallback)) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    }
    const query = params.toString()
    if (opts.search === undefined) {
      let url = globalThis.location.pathname
      if (query !== "") url += "?" + query
      url += globalThis.location.hash
      globalThis.history.replaceState(null, "", url)
    }
    return query
  }

  globalThis.VM = {...globalThis.VM, ui: {...globalThis.VM?.ui, urlParam, syncUrlParams}}
})(window)
