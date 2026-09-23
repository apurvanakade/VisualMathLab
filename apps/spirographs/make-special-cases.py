# Copyright (c) 2026 Apurva Nakade. All rights reserved.
# Released under Apache 2.0 license as described in the file LICENSE.
# Authors: Apurva Nakade

"""Draws the special-case pictures for the Spirographs page's table.

Writes one SVG per case into this folder, using the same curve formula as
the page's `curve` cell:

    z(t) = a e^{it} + sigma d e^{-i sigma k t},   sigma = +1 inside, -1 outside,
    a = R - sigma r,  k = a / r.

Standard library only. Re-run after changing a case's parameters:

    python3 apps/spirographs/make-special-cases.py
"""

import cmath
import math
import os
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))

# Mid-tone versions of the chart's --vm-color-fn / --vm-color-muted, since
# an <img> can't read the page's theme tokens: both stay readable on the
# light and the dark background.
PATH_COLOR = "#3b82f6"
CIRCLE_COLOR = "#94a3b8"

# name -> (R, r, d, mode); each matches the example its "Try it" link loads.
CASES = {
    "line": (2, 1, 1, "inside"),
    "ellipse": (2, 1, 0.5, "inside"),
    "hypocycloid": (4, 1, 1, "inside"),
    "epicycloid": (2, 1, 1, "outside"),
    "cardioid": (1, 1, 1, "outside"),
    "limacon": (1, 1, 1.6, "outside"),
    "rose": (8, 3, 5, "inside"),
}


def curve_points(R, r, d, mode, samples_per_turn=720):
    sigma = 1
    if mode == "outside":
        sigma = -1
    a = R - sigma * r
    k = a / r
    # The curve closes after q turns when R/r = p/q.
    turns = Fraction(R / r).limit_denominator(1000).denominator
    count = samples_per_turn * turns
    points = []
    for i in range(count + 1):
        t = 2 * math.pi * turns * i / count
        z = a * cmath.exp(1j * t) + sigma * d * cmath.exp(-1j * sigma * k * t)
        points.append(z)
    return points


def svg(R, r, d, mode, size=160):
    points = curve_points(R, r, d, mode)
    # A square view centered on the bounding box of the curve and the fixed
    # circle together, so a lopsided curve (the cardioid) still sits in the
    # middle of its cell.
    xs = [z.real for z in points] + [-R, R]
    ys = [z.imag for z in points] + [-R, R]
    mid = complex((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    half = max(max(xs) - min(xs), max(ys) - min(ys)) / 2 * 1.06
    scale = size / (2 * half)

    def xy(z):
        # SVG's y axis points down.
        w = z - mid
        return (w.real + half) * scale, (half - w.imag) * scale

    coords = []
    for z in points:
        x, y = xy(z)
        coords.append(f"{x:.2f},{y:.2f}")
    cx, cy = xy(0)
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">',
        f'  <circle cx="{cx:.2f}" cy="{cy:.2f}" r="{R * scale:.2f}" fill="none" stroke="{CIRCLE_COLOR}" stroke-width="1.2"/>',
        f'  <polyline points="{" ".join(coords)}" fill="none" stroke="{PATH_COLOR}" stroke-width="2" stroke-linejoin="round"/>',
        "</svg>",
    ]
    return "\n".join(lines) + "\n"


for name, (R, r, d, mode) in CASES.items():
    with open(os.path.join(HERE, f"{name}.svg"), "w") as f:
        f.write(svg(R, r, d, mode))
    print(f"wrote {name}.svg")
