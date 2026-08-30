# Topographic survey — El Olvido

`LEVANTAMIENTO GENERAL - EL OLVIDO 00.pdf`

| | |
|---|---|
| Surveyor | Topografía CAPAZ de R.L. · reviewed Arq. D. Paz, CAH #2540 |
| Owner | Juan Carlos Gonzales |
| Location | Aldea El Olvido, Municipio de Santa Cruz de Yojoa, Depto. de Cortés |
| Date | July 2025 |
| Sheet | 36 × 24 in exactly, plotted at true size |
| Scale | **1:830** — confirmed by Santiago. The title block also prints 1:1000; that one is nominal. |
| Control point | NORTE 1656178.8321 · ESTE 397522.0134 · ELEV 563.899 |
| Contours | 558 m – 587 m across the site, 0.50 m interval |

A vector CAD export, not a scan — 16,182 drawing primitives, so the geometry is
exact rather than measured off a picture.

## Viveros existentes — what the survey actually says

Extracted from the vector data, not read off the image.

| | Measured | At 1:830 |
|---|---|---|
| Post grid | 11 bays across × 18 bays along | |
| Bay spacing | 33.20 pt (33.14–33.26, ±0.2%) | **9.72 m** |
| Block across | 356.15 pt | **104.3 m** |
| Block along | 594.94 pt | **174.2 m** |
| Rotation | 72° from the sheet | not axis-aligned |
| Floor | 566.0 m – 569.5 m | **falls 3.5 m** |

## What the survey is for, and what it is not

The survey is **reference**, not the layout. The bed layout in the app was
already correct — four fields in a 2 x 2 around a crossing logistics road, taken
from the nursery's own plan:

| Field | Corner | Rows | Bed width | Bed length |
|---|---|---|---|---|
| E3 | NW | 33 | 1.20 m | 37.20 m |
| C3 | NE | 27 | 1.80 m | 37.20 m |
| E1 | SW | 33 | 1.20 m | 37.20 m |
| C1 | SE | 27 | 1.80 m | 37.20 m |

See `src/services/shadehouseLayout.ts`. That file is the layout; this document
never overrides it.

The survey was rebuilt against once and it was a mistake. Its post grid is
measured over the **whole** shadehouse footprint, its rotation is relative to
the sheet rather than to north, and its 1:830 scale is a correction to a title
block that prints something else — so a distance taken from it is not directly a
distance in the model. Reading the two as if they were the same coordinate
system turned a working layout into a mess.

What the survey is genuinely good for:

- **Where the nursery is.** The sheet plots the control monument and prints its
  coordinates beside it: NORTE 1656178.8321, ESTE 397522.0134, ELEV 563.899 —
  UTM zone 16N, which converts to **14.9786°N, 87.9531°W, 563.9 m**. The app had
  been using -87.85, about 11 km east. Now in `src/services/site.ts`.
- **Which way the beds face.** The compass needle is drawn exactly along the
  page axis, so north on the sheet is unambiguous. Inside "Viveros Existentes"
  the bed grid resolves into two perpendicular families: 70 lines run one way
  and 139 the other, and the 70 are the bed runs. They sit **18° off north**.
  Applying the UTM convergence at this longitude (0.25°, grid north west of
  true) gives a bed axis of **342.25° true — N17.75°W**, not north-south.
  This is orientation, not layout, and it is what the solar model turns on.

- **The floor falls 3.5 m** across the shadehouse, from 569.5 m down to 566.0 m.
  That is real and worth showing.
- **Contours at 0.50 m**, extracted to `src/services/terrain.generated.ts` as a
  height grid. Currently unused; kept for the terrain layer.
- **Post counts** — 12 along a bed's length, 19 perpendicular to the beds, which
  Santiago confirmed independently. These now stand across the whole house in
  the 3D view rather than only where a cable hangs.
- Confirmation that the site is surveyed CAD geometry, so any future measurement
  taken from it is exact.
