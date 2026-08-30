# Digital Nursery Intelligence — Project Memory

## Project
- **Name:** Digital Nursery Intelligence (was INV-FarmTrack)
- **Customer:** Broton Verde — ornamental plant nursery, El Olvido, Santa Cruz de Yojoa, Honduras
- **Type:** Power Apps code app (React 19 + Vite 7 + TypeScript + Tailwind 4)
- **Repo:** github.com/InveentaDigitalSolutions/INVFARMTRACK

## Environment
- **Name:** Enterprise DEV (Inveenta)
- **URL:** https://enterprisedev.crm16.dynamics.com
- **Environment ID:** Default-47176c00-abb5-4125-8ce3-a795dffd8b87
- **Tenant ID:** 47176c00-abb5-4125-8ce3-a795dffd8b87
- **Solution:** BrotonVerdeNursery · publisher BrotonVerde (prefix `bv`, option prefix 12132)
- **pac auth profile:** BrotonVerdeDev

## App
- **App ID:** 90ac39b0-04e9-41ef-872e-2718ac678629
- **Play URL:** https://apps.powerapps.com/play/e/default-47176c00-abb5-4125-8ce3-a795dffd8b87/app/90ac39b0-04e9-41ef-872e-2718ac678629
- **Last deployed:** 2026-08-30 — rate history chart, 2D terrain overlay

## Data
- 47 Dataverse tables, 572 columns, 64 relationships — see `dataverse/DATA_MODEL.md`
  (generated; run `npm run dataverse:docs` after any schema change and commit both)
- Every table's primary column is an autonumber: `SH-0001`, `PLT-0001`, …
- **All 45 mapped tables read and write live Dataverse** via `src/services/tableMap.ts`
  → `ENABLED_TABLES`. LocalStore is only the fallback for `npm run dev` with no
  `VITE_DATAVERSE_URL`, and its seeds are deliberately empty.
- Unmapped on purpose: `bv_Calendar` (date dimension, unused), `bv_OrderItem`
  (order lines — see BACKLOG.md).

### State of the data (2026-08-29)
The demo seed was deleted: 299 rows across 35 tables. What survives, by
Santiago's decision:

| Kept | Rows | Why |
|---|---|---|
| `bv_exchangerates` | 400 | Real central-bank HNL/USD history |
| `bv_components` | 7 | Nutrient chemistry — same for any nursery |
| `bv_shadehouses` | 1 | The real shadehouse |
| `bv_fields` | 4 | E3·33, C3·27, E1·33, C1·27 rows |
| `bv_beds` | 120 | Ground beds only; no air beds exist yet |

Autonumber seeds were reset, so real records start at `0001`.

`npm run dataverse:census` prints the current row count per table.

## Generated files — never hand-edit
| File | Generator |
|---|---|
| `dataverse/DATA_MODEL.md` | `npm run dataverse:docs` |
| `src/services/choiceMap.generated.ts` | `npm run dataverse:choices` |
| `src/services/rowTypes.generated.ts` | `npm run dataverse:rowtypes` |
| `src/services/columnKinds.generated.ts` | `npm run dataverse:rowtypes` |

## Checks that must pass before a deploy
```
npm test                            # 305 assertions across 13 suites
npm run test:smoke                  # opens all 11 modules in chromium, fails on
                                    #   any console error or blank screen
npm run build
npm run dataverse:check             # choice labels the app sends are ones Dataverse accepts
npm run dataverse:check-columns     # every displayed column exists in its binding
npm run dataverse:check-writes      # every save/delete handler reaches a store (72)
npm run dataverse:check-blank-saves # a half-filled form saves on all 45 tables
npm run dataverse:verify-writes     # create/patch/delete live, per table
```

## Flows
- **FarmTrack - Get Weather** `3a7f1e64-9c2b-4d18-b5e3-8f60c1a97d42` — PowerApps V2
  trigger (latitude, longitude) -> HTTP GET Open-Meteo -> returns `weather` as a
  JSON **string** (the Respond action only emits flat scalars, so the app must
  JSON.parse it). Uses the premium Http action. No DLP policies in the tenant.
  **Verified working in the player 2026-08-28.** Lives inside BrotonVerdeNursery —
  a personal flow is invisible to a code app, which is how the first attempt failed.
  A stale personal copy `e206cf2a-c439-49c0-9b1b-1333df4ead4e` is unused and can go.

## Gotchas
- **A blank form field is not an empty string to Dataverse.** `""` is accepted on a
  text column and rejected with a 400 on a date, number, choice or boolean — and the
  400 fails the *whole record*, so one untouched date threw away the entire form.
  `src/services/payload.ts` decides what a blank means per column kind, using
  `columnKinds.generated.ts`. This was the cause of "nothing ever saves".
- **A render-time exception blanks the whole app.** React unmounts the tree and the
  reason lives only in a console nobody has open. Two guards now exist:
  `ErrorBoundary` shows the message instead of a white page, and
  `npm run test:smoke` opens every module in a headless browser and fails on any
  console error. Both were added after emptying the demo seeds left
  `initRows[0]` undefined — `useFormModal` called `Object.entries` on it inside a
  useState initialiser and every screen with a form went blank.
- **The shadehouse layout is `src/services/shadehouseLayout.ts`, and nothing else.**
  Four fields in a 2 x 2 around a crossing logistics road — E3 NW · C3 NE · E1 SW ·
  C1 SE, beds 37.20 m long. It came from the nursery's own plan and is correct.
  The topographic survey (`dataverse/reference/SURVEY.md`) is reference for
  *detail* — the 3.5 m fall, the contours, the post counts — never for the
  layout. Rebuilding the geometry from it produced five wrong versions in a row
  while every unit test stayed green, because the survey's measurements span the
  whole footprint and its rotation is relative to the sheet, not to north.
- **The beds do not run north-south.** They run **N17.75°W** (bed axis 342.25°
  true), read off the survey's compass needle and bed grid. The 3D scene lays
  them along its own Z axis and the compass is turned to compensate, so model
  space and the real world are 17.75° apart — `services/site.ts` holds the
  position and bearing and `bearingToModel()` converts between them. Anything
  that has to point at the real sun goes through it.
- **Solar position needs no network.** `services/solar.ts` is the NOAA
  algorithm, checked against Greenwich at solar noon (179.98° — due south).
  Note the site is inside the tropics: the noon sun passes **north** of overhead
  from late April to mid-August, so shadows swing right through the compass
  twice a year, and day length only varies 11.1 h to 12.9 h.
- **Transparent objects in the scene need their draw order thought about.** The
  contour overlay was invisible under the two far fields and fine under the near
  two: three.js draws transparent meshes back-to-front, so the far beds were
  drawn first and wrote depth, and the overlay failed the depth test behind
  them. The overlay now has `renderOrder={-1}` and `depthWrite={false}`, and a
  faded bed writes no depth either.
- **The Terrain layer is deliberately 2D.** Contours are painted on the floor as
  a canvas texture, not displaced into a mesh: displacement would move every bed
  and reopen the layout. Beds fade to ~0.3 opacity while it is on, or they hide
  the thing being looked at.
- **Look at the 3D view before believing it.** `node scripts/test/shot3d.mjs
  out.png` renders it headless and writes a PNG. Build with an empty
  `VITE_DATAVERSE_URL` first or the preview has no session and draws an empty
  house. Tests pass on a layout that is visibly wrong.
- **Air beds go to level 2. Level 3 is the irrigation line**, above everything
  that grows, so it never holds a bed — `infrastructureRules.ts` refuses it and
  `parseBedName` does not accept `E3-12-3`.
- **Watch for import cycles.** `ShadehouseView` imported the hook that built its
  beds while the hook imported the view for `plotConfigs`. The shared model now
  lives in `services/shadehouseLayout.ts`, which depends on nothing.
- **Writes must never run uncaught.** They used to sit in an un-awaited async block,
  so a rejection became an unhandled promise: the row showed on screen because React
  state took it, and vanished at the next load. `useRecords` now reports through
  `services/writeErrors.ts` into a visible banner.
- **A client-minted id is a create, not an update.** A page that names its own row
  (`SHP-2026-001`) produced an id the store had never issued; the old diff treated it
  as an edit to a missing record and silently did nothing. See `services/syncPlan.ts`.
- `pac` and the CLI need `DOTNET_ROOT=$HOME/.dotnet` on this machine
- The SDK takes its session from the Power Apps host and ignores env tokens —
  local runs against real data use the Local Play URL that `npm run dev` prints
- `hostingMode()` reads `VITE_DATAVERSE_URL` **at build time**. If it is unset when
  `npm run build` runs, the deployed app silently falls back to LocalStore.
- The player enforces `connect-src 'none'`, `worker-src 'none'` and
  `style-src 'self'`: no outbound fetch, no web workers, no external styles.
  External data must come through a flow; fonts must be inlined as data URIs
  (served as files they arrive corrupted).
- **Reproduce the player sandbox locally** by serving `dist/` with those headers
  — that is how the blank 3D tab was finally diagnosed. drei's `<Text>` is
  troika-three-text, which fetches a unicode font index from cdn.jsdelivr.net at
  render time; the refusal killed the whole scene, not just the labels. Scene
  text is now drawn on a 2D canvas (`components/SceneText.tsx`).
  `npm run test:sandbox` fails if any CDN reference returns to the bundle.
- Code apps must be enabled per environment in the Power Platform Admin Center;
  the first push failed with `CodeAppOperationNotAllowedInEnvironment`
- Lookups cannot be written as `_bv_bedid_value`; they need
  `"bv_BedId@odata.bind": "/bv_beds(<guid>)"` — handled by `DataverseStore.bindLookups`
- Entity set names do not always pluralise predictably: `bv_soilanalysis` →
  `bv_soilanalysises`. Take them from metadata, never guess.

## Open work
See `BACKLOG.md`. The largest cluster is accounting and sales — invoice generation
creates no record, payments do not settle invoices, and orders have no lines.
