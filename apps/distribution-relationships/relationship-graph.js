/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad, Apurva Nakade
 */

(function attachVM(globalThis) {
  // An interactive node/edge diagram of how the standard distributions turn
  // into one another, rendered as SVG from a hand-authored layout.
  //
  // The layout is data, not a computation. An earlier version settled the
  // boxes with d3-force, anchored to hand-picked coordinates; even held at
  // strength 0.9 the physics rotated pairs against their own rows and bowed
  // every edge, so the diagram read as a tangle rather than a chart. The
  // model here is instead the classic Leemis & McQueston univariate
  // relationship chart: the page places every box on its own row, and edges
  // are straight lines between box borders. Nothing moves at runtime, so
  // what the page's coordinates say is exactly what renders, every load.
  //
  // Implements Observable Inputs' view contract (a `value` property, an
  // "input" event on change) so it slots into `viewof selection =
  // VM.relationshipGraph(...)` exactly like Inputs.checkbox -- same pattern
  // as js/ui/legend-overlay.js. `value` is null or {type: "node"|"edge", id}.
  //
  // Colocated with apps/distribution-relationships/index.qmd rather than
  // promoted into js/**, and flat (VM.relationshipGraph, not
  // VM.<category>.<fn>) for the same reason cubic-spline.js is: exactly one
  // page uses it. d3 is loaded by that page's own include-in-header for the
  // same reason -- it is the only page on the site that needs it.
  //
  // No color is named anywhere in this file. Everything visual is a class
  // the page's own <style> block paints from --vm-* tokens, so the diagram
  // re-themes with the site on a dark-mode toggle without this module
  // needing to know the theme exists.
  //
  // nodes: [{id, label, kind: "discrete"|"continuous", x, y}, ...] -- x, y
  // are the final positions in viewBox units, and `kind` picks the box
  // shape (a square-cornered box for a discrete family, a rounded one for a
  // continuous one, the same shape convention the reference chart uses).
  //
  // edges: [{id, from, to, type: "exact"|"limit", label, bidirectional?,
  // bend?}, ...]
  //   type          solid ("exact") vs dashed ("limit") stroke, the
  //                 convention on johndcook.com/blog/distribution_chart
  //   label         the sentence behind the tooltip and the a11y name; the
  //                 identity itself is in the page's detail panel, which is
  //                 what clicking the edge opens. Nothing is written on the
  //                 edges themselves -- 27 formulas laid over the lines
  //                 crowded the diagram more than they explained it
  //   bidirectional an arrowhead at both ends, for a relationship that
  //                 reads the same either way round
  //   bend          0 (the default) draws a straight line; a non-zero value
  //                 bows the edge by that fraction of its own length, which
  //                 is how the few edges that would otherwise clip a box --
  //                 or land on top of their own opposite-direction twin --
  //                 get out of the way

  const PAD_X = 16          // horizontal padding around a node's label
  const NODE_HEIGHT = 38
  const ARROW_GAP = 6       // breathing room between arrow tip and node border
  const RADIUS = {discrete: 0, continuous: 14}

  // Measures the label in the font the CSS actually applies, via a canvas
  // 2D context. The SVG is built detached, so getBBox()/getComputedTextLength()
  // both measure 0 here -- the previous version of this file worked around
  // that by guessing a per-character advance width, which mis-sized any label
  // whose glyphs were unusually wide or narrow.
  const measurer = (() => {
    let ctx = null
    return (text, font) => {
      if (!ctx) ctx = document.createElement("canvas").getContext("2d")
      ctx.font = font
      return ctx.measureText(text).width
    }
  })()

  // Reads the font the page's CSS puts on `className`, off a probe element
  // rather than hardcoded here, so restyling a label in CSS resizes what is
  // measured from it instead of silently clipping.
  //
  // The probe has to be attached to the document to be measured:
  // getComputedStyle on a detached element returns the initial values, not
  // the cascade's -- which yields canvas's default "10px sans-serif" and
  // sizes every box to roughly two-thirds of the text it has to hold. The
  // diagram's own SVG is built detached (OJS inserts the returned node after
  // the cell resolves), so the probe gets a throwaway offscreen SVG.
  const fontOf = (className) => {
    const holder = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    holder.setAttribute("aria-hidden", "true")
    holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden"
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "text")
    probe.setAttribute("class", className)
    holder.appendChild(probe)
    document.body.appendChild(holder)
    const style = globalThis.getComputedStyle(probe)
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    holder.remove()
    return font
  }

  // Where the ray leaving `box` toward (tx, ty) crosses the box's own border.
  // The exact axis-aligned-rectangle intersection: the ray exits at
  // whichever of the vertical/horizontal borders it reaches first.
  const boxEdgePoint = (box, tx, ty) => {
    const dx = tx - box.x
    const dy = ty - box.y
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    const sx = Math.abs(ux) < 1e-9 ? Infinity : box.halfWidth / Math.abs(ux)
    const sy = Math.abs(uy) < 1e-9 ? Infinity : (NODE_HEIGHT / 2) / Math.abs(uy)
    const t = Math.min(sx, sy)
    return {x: box.x + ux * t, y: box.y + uy * t}
  }

  // One quadratic Bezier serves both cases: with bend 0 the control point is
  // the midpoint, and a quadratic whose control point is the midpoint of its
  // own endpoints *is* the straight segment between them. So the straight
  // edges the chart is mostly made of, and the few bowed ones, come out of
  // one path builder rather than two.
  const edgePath = (from, to, bend) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const cx = (from.x + to.x) / 2 - dy * bend
    const cy = (from.y + to.y) / 2 + dx * bend

    // Both ends aim at the control point rather than at each other, so a
    // bowed edge leaves and arrives along its own tangent instead of
    // clipping the corner of the box it starts from.
    const backOff = (point) => {
      const ax = point.x - cx
      const ay = point.y - cy
      const len = Math.hypot(ax, ay) || 1
      return {x: point.x + (ax / len) * ARROW_GAP, y: point.y + (ay / len) * ARROW_GAP}
    }

    const start = backOff(boxEdgePoint(from, cx, cy))
    const end = backOff(boxEdgePoint(to, cx, cy))
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`
  }

  const relationshipGraph = (nodes, edges, options = {}) => {
    const d3 = globalThis.d3
    const width = options.width ?? 1120
    const height = options.height ?? 880
    let current = options.value ?? null

    const root = document.createElement("div")
    root.className = "ojs-graph-container"

    const svg = d3.select(root)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "group")
      .attr("aria-label", "Distribution relationship graph")
      .attr("class", "ojs-relationship-graph")

    // Arrowheads. One marker per edge type so each inherits its own class's
    // fill; `context-stroke` would be neater but Safari still doesn't take it.
    const defs = svg.append("defs")
    for (const type of ["exact", "limit"]) {
      defs.append("marker")
        .attr("id", `ojs-graph-arrow-${type}`)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 9)
        .attr("refY", 5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z")
        .attr("class", `ojs-graph-arrow-${type}`)
    }

    // Everything transformable lives under one <g> so pan/zoom is a single
    // transform rather than a per-element update. Edges are drawn first, so
    // a line always meets a box's border underneath it rather than crossing
    // over its label.
    const view = svg.append("g").attr("class", "ojs-graph-view")
    const edgeLayer = view.append("g")
    const nodeLayer = view.append("g")

    const labelFont = fontOf("ojs-graph-node-probe")

    // Local copies: the caller's `graphNodes` cell is shared reactive state,
    // not scratch space, and the rendered box width is derived here.
    const layoutNodes = []
    for (const node of nodes) {
      layoutNodes.push({
        id: node.id,
        label: node.label,
        kind: node.kind === "discrete" ? "discrete" : "continuous",
        halfWidth: measurer(node.label, labelFont) / 2 + PAD_X,
        x: node.x,
        y: node.y
      })
    }

    const nodeById = new Map()
    for (const node of layoutNodes) nodeById.set(node.id, node)

    const layoutEdges = []
    for (const edge of edges) {
      layoutEdges.push({
        id: edge.id,
        type: edge.type,
        label: edge.label,
        bidirectional: Boolean(edge.bidirectional),
        bend: edge.bend ?? 0,
        source: nodeById.get(edge.from),
        target: nodeById.get(edge.to)
      })
    }

    // Which nodes/edges stay lit when something is selected.
    const neighbours = new Map()
    for (const node of layoutNodes) neighbours.set(node.id, new Set([node.id]))
    for (const edge of layoutEdges) {
      neighbours.get(edge.source.id).add(edge.target.id)
      neighbours.get(edge.target.id).add(edge.source.id)
    }

    const edgeGroups = edgeLayer.selectAll("g")
      .data(layoutEdges)
      .join("g")
      .attr("class", d => `ojs-graph-edge-group ojs-graph-edge-${d.type}`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => d.label ?? `${d.source.id} to ${d.target.id}`)

    edgeGroups.append("title").text(d => d.label ?? `${d.source.id} → ${d.target.id}`)

    // An invisible fat stroke under the visible one: a 2px line is a
    // painfully small pointer target, and widening the drawn edge to fix that
    // would swamp the diagram.
    const hitPaths = edgeGroups.append("path").attr("class", "ojs-graph-edge-hit")
    const edgePaths = edgeGroups.append("path")
      .attr("class", "ojs-graph-edge")
      .attr("marker-end", d => `url(#ojs-graph-arrow-${d.type})`)
      // A relationship that reads the same in both directions gets a head at
      // each end. The markers declare orient="auto-start-reverse", so one
      // definition points outward at both.
      .attr("marker-start", d => d.bidirectional ? `url(#ojs-graph-arrow-${d.type})` : null)

    const nodeGroups = nodeLayer.selectAll("g")
      .data(layoutNodes)
      .join("g")
      .attr("class", d => `ojs-graph-node is-${d.kind}`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => d.label)

    nodeGroups.append("title").text(d => d.label)

    nodeGroups.append("rect")
      .attr("x", d => -d.halfWidth)
      .attr("y", -NODE_HEIGHT / 2)
      .attr("width", d => d.halfWidth * 2)
      .attr("height", NODE_HEIGHT)
      // Square corners for a discrete family, rounded for a continuous one:
      // the shape carries the one property every box has, so the reader gets
      // it from the picture instead of from the blurb below.
      .attr("rx", d => RADIUS[d.kind])

    nodeGroups.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(d => d.label)

    const redraw = () => {
      nodeGroups.attr("transform", d => `translate(${d.x}, ${d.y})`)
      const path = d => edgePath(d.source, d.target, d.bend)
      edgePaths.attr("d", path)
      hitPaths.attr("d", path)
    }
    redraw()

    // The box widths above come from a canvas measurement of the label font.
    // That font is a webfont (Inter), which may still be loading when this
    // runs -- in which case the measurement used a fallback's metrics and
    // every box is sized slightly wrong. Once the real font is in, re-measure
    // from the live text elements (getBBox is exact, and they are attached by
    // then) and resize anything that moved. Usually a no-op. Positions never
    // change here: a box grows about its own center, and the edges are then
    // redrawn against the new borders.
    const refitToRenderedText = () => {
      if (!root.isConnected) return
      let changed = false
      nodeGroups.each(function (d) {
        const rendered = this.querySelector("text").getBBox().width
        if (!rendered) return
        const halfWidth = rendered / 2 + PAD_X
        if (Math.abs(halfWidth - d.halfWidth) < 0.5) return
        d.halfWidth = halfWidth
        changed = true
      })
      if (!changed) return
      nodeGroups.select("rect")
        .attr("x", d => -d.halfWidth)
        .attr("width", d => d.halfWidth * 2)
      redraw()
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(refitToRenderedText))
    }

    // ── Selection ────────────────────────────────────────────────────
    const sameSelection = (a, b) => {
      if (!a || !b) return a === b
      return a.type === b.type && a.id === b.id
    }

    const paint = () => {
      const lit = current?.type === "node" ? neighbours.get(current.id) : null
      nodeGroups
        .classed("is-selected", d => current?.type === "node" && current.id === d.id)
        // Selecting a distribution fades everything it has no relationship
        // with, so the neighbourhood being described below the graph is
        // legible at a glance rather than having to be traced by eye.
        .classed("is-dimmed", d => lit !== null && !lit.has(d.id))
      edgeGroups
        .classed("is-selected", d => current?.type === "edge" && current.id === d.id)
        .classed("is-dimmed", d => {
          if (lit !== null) return !(lit.has(d.source.id) && lit.has(d.target.id))
          return current?.type === "edge" && current.id !== d.id
        })
    }

    const setSelection = (next, {silent = false} = {}) => {
      if (sameSelection(current, next)) return
      current = next
      paint()
      if (!silent) root.dispatchEvent(new Event("input", {bubbles: true}))
    }

    // Clicking the same thing again clears the selection -- the only way back
    // to the intro state without reloading.
    const toggle = (next) => {
      if (sameSelection(current, next)) setSelection(null)
      else setSelection(next)
    }

    const bindActivation = (selection, toValue) => {
      selection
        .on("click", (event, d) => {
          event.stopPropagation()
          toggle(toValue(d))
        })
        // An SVG <g> gets neither Enter nor Space for free the way a real
        // <button> does.
        .on("keydown", (event, d) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          toggle(toValue(d))
        })
    }

    bindActivation(nodeGroups, d => ({type: "node", id: d.id}))
    bindActivation(edgeGroups, d => ({type: "edge", id: d.id}))

    svg.on("click", () => setSelection(null))
    svg.on("keydown", (event) => {
      if (event.key !== "Escape" || !current) return
      event.preventDefault()
      setSelection(null)
    })

    // ── Pan and zoom ─────────────────────────────────────────────────
    // Boxes are not draggable. Their positions are the chart -- the rows and
    // columns are what makes the relationships readable -- so a drag would
    // only let the reader take the structure apart. Panning and zooming move
    // the reader through it instead, and double-click puts the view back.
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .filter(event => {
        // Wheel zoom is deliberately off. The map sits partway down a long
        // page, so scrolling toward the content below it would silently zoom
        // the diagram instead of moving the page -- the reader loses their
        // place and has to undo a zoom they never asked for. Panning by drag
        // and the double-click reset below still work, and pinch-zoom on
        // touch is unaffected (it arrives as touch events, not wheel).
        if (event.type === "wheel") return false
        return !event.button
      })
      .on("start", () => root.classList.add("is-dragging"))
      .on("zoom", event => view.attr("transform", event.transform))
      .on("end", () => root.classList.remove("is-dragging"))
    svg.call(zoom)
    // Double-click resets the view rather than zooming in another step.
    svg.on("dblclick.zoom", null)
    svg.on("dblclick", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity))

    // Reflect an option-supplied selection (one restored from the URL) into
    // the classes. paint(), not setSelection(): the value already equals
    // `current`, so setSelection would read that as "no change" and repaint
    // nothing.
    paint()

    Object.defineProperty(root, "value", {
      get() { return current },
      set(next) { setSelection(next, {silent: true}) }
    })

    return root
  }

  globalThis.VM = {...globalThis.VM, relationshipGraph}
})(window)
