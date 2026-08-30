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

## The layout, derived

Santiago: the four fields sit inside this one block, with the logistics road as
a cross between them, and the north–south arm falling after the 33rd bed of
both E fields. That fixes every remaining dimension against the survey:

| | | |
|---|---|---|
| E3, E1 | 33 beds x 1.20 m | 39.60 m |
| C3, C1 | 27 beds x 1.80 m | 48.60 m |
| beds together | | 88.20 m |
| block across | *surveyed* | **104.28 m** |
| **logistics road** | what is left | **16.08 m** |

and along the block, two field-lengths either side of the cross arm:

| | | |
|---|---|---|
| block along | *surveyed* | **174.20 m** |
| less the road | | 158.12 m |
| **bed length** | halved | **79.06 m** |

Both close exactly: 39.60 + 16.08 + 48.60 = 104.28, and 79.06 + 16.08 + 79.06
= 174.20. The bed widths were Santiago's and the survey confirms them; the bed
length was 37.20 m read off a photograph and was wrong by more than half.

The cross arm is taken to be the same width as the north–south road. That is
the one assumption here — the survey cannot measure the roads directly, because
the post grid runs straight over them: the shade structure spans the road.

Tied down by `npm run test:geometry`, so the constants and the survey cannot
drift apart.

## What this corrected in the model

`src/services/shadehouseLayout.ts` still carries numbers measured off a
photograph. Three of them are now known to be wrong or unverified:

| | was | now |
|---|---|---|
| bed length | 37.20 m *(off a photo)* | **79.06 m** |
| logistics road | 3.5 m *(assumed)* | **16.08 m** |
| post bay | 3.6 m *("roughly")* | **9.72 m** |
| block | ~91.7 x 78 m | **104.28 x 174.20 m** |

The 3D camera was reframed with it: the old position was set for a model less
than half as long and cropped the block badly.

## Still open

- **The structure is rotated 72°** and the model draws it square. Only matters
  if the plan is ever laid over a map or a satellite image.
- **The floor falls 3.5 m** and the model stands the nursery on a flat plane.
  Worth doing for drainage and for seeing where water actually runs, but it is
  a bigger build than the envelope was.
