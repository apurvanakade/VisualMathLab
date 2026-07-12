/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  const csvCell = value => {
    const s = String(value)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const toCsv = (headers, rows) => {
    const allRows = [headers, ...rows]
    const lines = []
    for (const row of allRows) {
      const cells = []
      for (const cell of row) cells.push(csvCell(cell))
      lines.push(cells.join(","))
    }
    return lines.join("\n")
  }

  const downloadCsv = (csv, filename) => {
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  // Returns a DOM table node, styled entirely with Bootstrap utility classes:
  // table/table-sm/table-bordered for structure, small for compact text, and
  // per-column text-center/text-end + text-nowrap for the numeric data
  // (the first column is the iteration number; the rest are numeric).
  //
  // csvHeaders are plain-text column labels for the downloaded file — separate
  // from headers, which may contain KaTeX DOM nodes (from `tex` templates)
  // that render fine on screen but not as CSV text.
  const renderTable = ({html, headers, rows, csvHeaders = headers, filename = "iteration-table.csv"}) => {
    const cellClass = i => {
      if (i === 0) return "text-nowrap text-center"
      return "text-nowrap text-end"
    }

    // Built as a real DOM node (not a `${...}` attribute expression) because
    // this project's `html` tag doesn't wire up inline event-handler attributes.
    const downloadLink = document.createElement("a")
    downloadLink.href = "#"
    downloadLink.textContent = "Download csv"
    downloadLink.addEventListener("click", event => {
      event.preventDefault()
      downloadCsv(toCsv(csvHeaders, rows), filename)
    })

    const headerCells = []
    for (let i = 0; i < headers.length; i++) {
      headerCells.push(html`<th class="${cellClass(i)}">${headers[i]}</th>`)
    }

    const bodyRows = []
    for (const row of rows) {
      const rowCells = []
      for (let i = 0; i < row.length; i++) {
        rowCells.push(html`<td class="${cellClass(i)}">${row[i]}</td>`)
      }
      bodyRows.push(html`<tr>${rowCells}</tr>`)
    }

    return html`
      <div class="ojs-table-toolbar">${downloadLink}</div>
      <div class="ojs-table-container"><table class="table table-sm table-bordered small">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table></div>`
  }

  globalThis.VM = {...globalThis.VM, renderTable}
})(window)
