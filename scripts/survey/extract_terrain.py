"""
Turns the topographic survey's contour lines into a height field for the 3D view.

The nursery floor falls 3.5 m from one end to the other and the model has been
standing it on a flat plane. The survey draws that fall as contours — green at
1.00 m, amber at 0.50 m — each with its elevation printed beside it.

This reads the contour polylines out of the PDF's vector data, matches each to
its printed elevation, projects them into the block's own axes, and samples a
grid by inverse-distance weighting. The output is a small generated module the
scene can displace its ground with.

Needs pymupdf. Run:  python3 scripts/survey/extract_terrain.py
"""
import json
import math
import re
from pathlib import Path

import fitz

PDF = Path.home() / "Desktop" / "LEVANTAMIENTO GENERAL - EL OLVIDO 00.pdf"
OUT = Path("src/services/terrain.generated.ts")

GREEN = (0.0, 0.58, 0.0)      # 1.00 m contours, labelled "568.00m"
AMBER = (0.87, 0.65, 0.0)     # 0.50 m contours, labelled "568.50"

M_PER_PT = 0.29281            # 1:830 on a sheet plotted at true size
BEARING = math.radians(72.0)  # the block sits this far off the sheet's x axis

# The block, as measured from the same survey.
ACROSS_M, ALONG_M = 104.28, 174.20
GRID_ACROSS, GRID_ALONG = 28, 46      # samples; ~3.7 m apart either way

page = fitz.open(PDF)[0]
u = (math.cos(BEARING), math.sin(BEARING))    # along the block
v = (-math.sin(BEARING), math.cos(BEARING))   # across it


def local(x, y):
    """PDF point -> the block's own axes, still in points."""
    return x * u[0] + y * u[1], x * v[0] + y * v[1]


# ── the contour lines, one entry per drawn path ─────────────────────────────
paths = []
for g in page.get_drawings():
    c = g.get("color")
    if not c:
        continue
    t = tuple(round(n, 2) for n in c)
    if t not in (GREEN, AMBER):
        continue
    pts = [(it[1].x, it[1].y) for it in g["items"] if it[0] == "l"]
    pts += [(it[2].x, it[2].y) for it in g["items"] if it[0] == "l"]
    if pts:
        paths.append(pts)

# ── the printed elevations ──────────────────────────────────────────────────
labels = []
for w in page.get_text("words"):
    m = re.fullmatch(r"(5[5-8]\d\.\d+)m?", w[4])
    if m:
        labels.append(((w[0] + w[2]) / 2, (w[1] + w[3]) / 2, float(m.group(1))))

# ── give every path the elevation printed nearest to it ─────────────────────
# A contour is drawn as many short paths, so this is done per path rather than
# per line: the label sits beside one of them and the rest are matched by being
# near it. Anything further than 60 pt from a label is left out — a guessed
# height is worse than a gap the interpolation can bridge.
samples = []
for pts in paths:
    best_d, best_v = 1e18, None
    for px, py in pts[:: max(1, len(pts) // 6)]:
        for lx, ly, val in labels:
            d = (px - lx) ** 2 + (py - ly) ** 2
            if d < best_d:
                best_d, best_v = d, val
    if best_v is None or math.sqrt(best_d) > 60:
        continue
    for px, py in pts:
        samples.append((*local(px, py), best_v))

print(f"  {len(paths)} contour paths, {len(labels)} printed elevations")
print(f"  {len(samples)} height samples")

# ── the block, in the same axes ─────────────────────────────────────────────
# Its centre is taken from the extent of the samples that fall on it, which is
# the same frame placeBeds works in.
us = sorted(s[0] for s in samples)
vs = sorted(s[1] for s in samples)
half_u, half_v = ALONG_M / 2 / M_PER_PT, ACROSS_M / 2 / M_PER_PT

# Centre on the surveyed block, measured from the extent of its post grid:
#   along  936.52 .. 1532.33   across  -414.23 .. -57.18
CU, CV = 1234.43, -235.70

# ── interpolate BETWEEN contours, not along them ────────────────────────────
# Weighting the nearest samples directly gives a terraced surface: contour
# vertices are dense, so every sample near a point lies on the same line and the
# result snaps to that line's elevation. Taking the nearest point on each
# distinct contour instead, and weighting those against each other, is what
# actually interpolates the slope between them.
import numpy as np

by_elev = {}
for su, sv, val in samples:
    by_elev.setdefault(val, []).append((su, sv))

# Contour vertices are far denser than the grid needs; thinning keeps this
# quick without changing the surface.
elevs, clouds = [], []
for val, pts in sorted(by_elev.items()):
    arr = np.array(pts)
    if len(arr) > 400:
        arr = arr[:: len(arr) // 400]
    elevs.append(val)
    clouds.append(arr)
elevs = np.array(elevs)
print(f"  {len(elevs)} distinct contour elevations after thinning")

NEAREST = 4          # contours to weight against each other
grid, lo, hi = [], 1e9, -1e9
for j in range(GRID_ALONG):
    row = []
    for i in range(GRID_ACROSS):
        gu = CU + (j / (GRID_ALONG - 1) - 0.5) * 2 * half_u
        gv = CV + (i / (GRID_ACROSS - 1) - 0.5) * 2 * half_v
        # Distance to the closest point on each contour.
        d = np.array([
            np.min((c[:, 0] - gu) ** 2 + (c[:, 1] - gv) ** 2) for c in clouds
        ])
        order = np.argsort(d)[:NEAREST]
        dd, vv = d[order], elevs[order]
        if dd[0] < 1e-9:
            h = float(vv[0])
        else:
            w = 1.0 / dd
            h = float((vv * w).sum() / w.sum())
        row.append(h)
        lo, hi = min(lo, h), max(hi, h)
    grid.append(row)

mean = sum(sum(r) for r in grid) / (GRID_ACROSS * GRID_ALONG)
print(f"  interpolated {GRID_ACROSS} x {GRID_ALONG}: {lo:.2f} .. {hi:.2f} m (fall {hi-lo:.2f} m)")

body = f"""/**
 * GENERATED by scripts/survey/extract_terrain.py — do not edit.
 *
 * The nursery floor, read off the contours of the topographic survey
 * (Topografía CAPAZ, July 2025, 1:830). Heights are metres above sea level on
 * a regular grid over the shadehouse block: {GRID_ACROSS} samples across by
 * {GRID_ALONG} along, about 3.7 m apart.
 *
 * Regenerate with: python3 scripts/survey/extract_terrain.py
 */

/** Samples across the block (the {ACROSS_M} m axis). */
export const TERRAIN_ACROSS = {GRID_ACROSS};
/** Samples along the block (the {ALONG_M} m axis). */
export const TERRAIN_ALONG = {GRID_ALONG};

/** Metres above sea level, row-major: [along][across]. */
export const TERRAIN_M: number[][] = {json.dumps([[round(h, 3) for h in r] for r in grid])};

/** The mean floor level, so the mesh can be drawn relative to it. */
export const TERRAIN_MEAN_M = {mean:.3f};
export const TERRAIN_LOW_M = {lo:.2f};
export const TERRAIN_HIGH_M = {hi:.2f};
"""
OUT.write_text(body)
print(f"  wrote {OUT}")
