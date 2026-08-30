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

## What this contradicts in the model

`src/services/shadehouseLayout.ts` still carries numbers measured off a
photograph. Three of them are now known to be wrong or unverified:

- **The block is far longer than modelled.** The model is ~91.7 × 78 m, built
  from 33 × 1.2 m and 27 × 1.8 m beds at 37.2 m long. The survey's long axis is
  174.2 m — more than double. Either beds are much longer than 37.2 m, or there
  are four rows of fields where the model has two.
- **The shadehouse is rotated 72°**, and drawn axis-aligned in a 2 × 2 quadrant
  arrangement with a cross-road. The survey shows one rotated rectangle.
- **The floor is not flat.** It falls 3.5 m, which matters for drainage and for
  where water actually runs.

Post spacing in the model (`POST_SPACING_M = 3.6`, "roughly") is superseded by
the measured 9.72 m bay — but only once we know how the fields map onto the
11 × 18 grid.

## Still to confirm before the model is changed

How the four fields — E3 (33 rows), C3 (27), E1 (33), C1 (27) — sit inside the
11 × 18 bay grid. Until that is known, changing the constants would replace one
guess with another.
