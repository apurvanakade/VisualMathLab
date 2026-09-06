/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad, Apurva Nakade
 */

(function attachVM(globalThis) {
  // An interactive node/edge diagram of how the standard distributions turn
  // into one another, laid out with d3-force and rendered as SVG.
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
  // nodes: [{id, label, x, y}, ...] -- x, y seed the layout (see below).
  // edges: [{id, from, to, type: "exact"|"limit", label, bidirectional?},
  // ...] -- type picks a solid ("exact") vs dashed ("limit") stroke, the
  // convention on johndcook.com/blog/distribution_chart. bidirectional draws
  // an arrowhead at both ends, for a relationship that reads the same either
  // way round.

  const PAD_X = 18          // horizontal padding around a node's label
  const NODE_HEIGHT = 40
  const CURVE = 0.09        // edge bow, as a fraction of its own length
  const ARROW_GAP = 5       // breathing room between arrow tip and node border

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

  // Where the ray leaving `box` toward (tx, ty) crosses the box's own border.
  // The exact axis-aligned-rectangle intersection: the ray exits at
  // t = min(halfWidth/|ux|, halfHeight/|uy|), whichever side it reaches first.
  const boxEdgePoint = (box, tx, ty) => {
    const dx = tx - box.x
    const dy = ty - box.y
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    // Infinity when the ray runs parallel to that pair of sides, so `min`
    // correctly picks the other pair.
    const sx = Math.abs(ux) < 1e-9 ? Infinity : box.halfWidth / Math.abs(ux)
    const sy = Math.abs(uy) < 1e-9 ? Infinity : (NODE_HEIGHT / 2) / Math.abs(uy)
    const t = Math.min(sx, sy)
    return {x: box.x + ux * t, y: box.y + uy * t}
  }

  // A quadratic bezier from one node's border to the other's, bowed slightly
  // off the straight line. Both endpoints are found along the direction of
  // the control point rather than of the opposite center, so each one sits on
  // the border exactly where the curve actually arrives -- which is also the
  // tangent `marker-end` orients the arrowhead to.
  const edgePath = (from, to) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const cx = (from.x + to.x) / 2 - dy * CURVE
    const cy = (from.y + to.y) / 2 + dx * CURVE

    // Pull each tip back off its border so an arrowhead there doesn't sit on
    // the stroke, along the tangent -- which is the control-point ray.
    const backOff = (point) => {
      const dx = point.x - cx
      const dy = point.y - cy
      const len = Math.hypot(dx, dy) || 1
      return {x: point.x - (dx / len) * ARROW_GAP, y: point.y - (dy / len) * ARROW_GAP}
    }
    const start = backOff(boxEdgePoint(from, cx, cy))
    const end = backOff(boxEdgePoint(to, cx, cy))
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`
  }

  const relationshipGraph = (nodes, edges, options = {}) => {
    const d3 = globalThis.d3
    const width = options.width ?? 1000
    const height = options.height ?? 620
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
    // transform rather than a per-element update.
    const view = svg.append("g").attr("class", "ojs-graph-view")
    const edgeLayer = view.append("g")
    const nodeLayer = view.append("g")

    // The font the page's CSS puts on .ojs-graph-node text, read off a probe
    // rather than hardcoded here, so restyling the label in CSS resizes the
    // boxes to match instead of silently clipping the text.
    //
    // The probe has to be attached to the document to be measured:
    // getComputedStyle on a detached element returns the initial values, not
    // the cascade's -- which yields canvas's default "10px sans-serif" and
    // sizes every capsule to roughly two-thirds of the text it has to hold.
    // This whole SVG is built detached (OJS inserts the returned node after
    // the cell resolves), so the probe gets its own throwaway offscreen SVG
    // instead of borrowing this one.
    const labelFont = (() => {
      const holder = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      holder.setAttribute("aria-hidden", "true")
      holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden"
      const probe = document.createElementNS("http://www.w3.org/2000/svg", "text")
      probe.setAttribute("class", "ojs-graph-node-probe")
      holder.appendChild(probe)
      document.body.appendChild(holder)
      const style = globalThis.getComputedStyle(probe)
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      holder.remove()
      return font
    })()

    // d3-force mutates the objects it is given, so work on copies -- the
    // caller's `graphNodes` cell is shared reactive state, not scratch space.
    const simNodes = []
    for (const node of nodes) {
      simNodes.push({
        id: node.id,
        label: node.label,
        halfWidth: measurer(node.label, labelFont) / 2 + PAD_X,
        // The hand-placed coordinates seed the layout and, via forceX/forceY
        // below, keep anchoring it -- the semantic grouping they encode
        // (discrete family left, continuous right, Normal as the hub) is
        // information a physics simulation has no way to recover on its own.
        x: node.x,
        y: node.y,
        anchorX: node.x,
        anchorY: node.y
      })
    }

    const nodeById = new Map()
    for (const node of simNodes) nodeById.set(node.id, node)

    const simEdges = []
    for (const edge of edges) {
      simEdges.push({
        id: edge.id,
        type: edge.type,
        label: edge.label,
        bidirectional: Boolean(edge.bidirectional),
        source: nodeById.get(edge.from),
        target: nodeById.get(edge.to)
      })
    }

    // Which nodes/edges stay lit when something is selected.
    const neighbours = new Map()
    for (const node of simNodes) neighbours.set(node.id, new Set([node.id]))
    for (const edge of simEdges) {
      neighbours.get(edge.source.id).add(edge.target.id)
      neighbours.get(edge.target.id).add(edge.source.id)
    }

    // The anchors carry the layout and the simulation only cleans up after
    // them. With 27 edges among 17 boxes a freely-settling force layout
    // scrambles the mathematical grouping -- it pulled the whole continuous
    // family into the middle and ran the long CLT edges straight across the
    // diagram -- and it lands somewhere slightly different on every load.
    // Strong positional forces plus collision keep the hand-designed bands
    // intact while still guaranteeing nothing overlaps, so link and charge
    // are left just strong enough to open up an accidentally tight corner.
    const simulation = d3.forceSimulation(simNodes)
      .force("link", d3.forceLink(simEdges).id(d => d.id).distance(150).strength(0.02))
      .force("charge", d3.forceManyBody().strength(-140))
      // Half-width plus a margin: collision is what actually guarantees no
      // two boxes overlap, which the old fixed layout could only promise by
      // hand-checking every coordinate.
      .force("collide", d3.forceCollide(d => d.halfWidth + 22))
      .force("x", d3.forceX(d => d.anchorX).strength(0.9))
      .force("y", d3.forceY(d => d.anchorY).strength(0.9))
      .stop()

    // Settled synchronously before first paint, so the diagram appears
    // already at rest instead of visibly swimming into place on load.
    simulation.tick(400)

    // Keep every box fully inside the viewBox. Called after each settle,
    // including the webfont refit below -- that re-ticks the simulation with
    // wider capsules, which can otherwise push a node off the edge (it did:
    // F-distribution, the widest label, sat outside the frame).
    const clampToFrame = () => {
      for (const node of simNodes) {
        node.x = Math.max(node.halfWidth + 12, Math.min(width - node.halfWidth - 12, node.x))
        node.y = Math.max(NODE_HEIGHT / 2 + 12, Math.min(height - NODE_HEIGHT / 2 - 12, node.y))
      }
    }
    clampToFrame()

    const edgeGroups = edgeLayer.selectAll("g")
      .data(simEdges)
      .join("g")
      .attr("class", d => `ojs-graph-edge-group ojs-graph-edge-${d.type}`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => d.label ?? `${d.source.id} to ${d.target.id}`)

    edgeGroups.append("title").text(d => d.label ?? `${d.source.id} → ${d.target.id}`)

    // An invisible fat stroke under the visible one: a 2px curve is a
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
      .data(simNodes)
      .join("g")
      .attr("class", "ojs-graph-node")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => d.label)

    nodeGroups.append("title").text(d => d.label)

    nodeGroups.append("rect")
      .attr("x", d => -d.halfWidth)
      .attr("y", -NODE_HEIGHT / 2)
      .attr("width", d => d.halfWidth * 2)
      .attr("height", NODE_HEIGHT)
      // Fully rounded ends: a capsule reads as a chip/token rather than the
      // boxed flowchart node this diagram used to look like.
      .attr("rx", NODE_HEIGHT / 2)

    nodeGroups.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(d => d.label)

    const redraw = () => {
      nodeGroups.attr("transform", d => `translate(${d.x}, ${d.y})`)
      const path = d => edgePath(d.source, d.target)
      edgePaths.attr("d", path)
      hitPaths.attr("d", path)
    }
    redraw()

    // The capsule widths above come from a canvas measurement of the label
    // font. That font is a webfont (Inter), which may still be loading when
    // this runs -- in which case the measurement used a fallback's metrics
    // and every capsule is sized slightly wrong. Once the real font is in,
    // re-measure from the live text elements (getBBox is exact, and they are
    // attached by then) and resize anything that moved. Usually a no-op.
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
      // Wider capsules can now overlap, so let collision resolve it again.
      simulation.force("collide", d3.forceCollide(d => d.halfWidth + 26))
      simulation.tick(60)
      clampToFrame()
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

    // ── Drag and zoom ────────────────────────────────────────────────
    // Dragging re-heats the simulation so the neighbours make room rather
    // than the dragged node sliding over them.
    nodeGroups.call(
      d3.drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.25).restart()
          d.fx = d.x
          d.fy = d.y
          root.classList.add("is-dragging")
        })
        .on("drag", (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          // Released nodes stay put: a reader who arranges the map to their
          // liking should keep that arrangement.
          d.fx = d.x
          d.fy = d.y
          root.classList.remove("is-dragging")
        })
    )

    simulation.on("tick", redraw)

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
        // Drag on a node moves that node; drag on the background pans.
        if (event.target.closest(".ojs-graph-node")) return false
        return !event.button
      })
      .on("zoom", event => view.attr("transform", event.transform))
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
