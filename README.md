# Digital Nursery Intelligence

A Power Apps **code app** for Broton Verde, an ornamental plant nursery in
El Olvido, Santa Cruz de Yojoa, Honduras. It covers the nursery end to end:
the shadehouse and its beds, what is planted and pruned, what is counted and
packed, who worked and what it cost, and the invoicing that follows —
including Honduran CAI fiscal numbering.

Built with **React 19 + TypeScript + Vite 7 + Tailwind CSS 4**, reading and
writing **Microsoft Dataverse** through the Power Apps SDK.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Platform | Microsoft Power Apps (code app, preview) |
| Data | Microsoft Dataverse — 47 tables, publisher prefix `bv_` |
| Charts | Hand-drawn SVG / CSS; no chart library |
| Icons | lucide-react |
| Animation | framer-motion |

---

## Data model

47 tables, 572 columns, 64 relationships. The full reference is
[`dataverse/DATA_MODEL.md`](dataverse/DATA_MODEL.md) — **generated**, never
hand-edited.

Broadly:

| Area | Tables |
|---|---|
| Infrastructure | shadehouse, field, bed, bed composition, substrate material |
| Production | plant, season, planting, treatment, irrigation, fertilisation, pruning, harvest, task, bed count |
| Agronomy | soil analysis, foliar analysis, nutrient balance, component, input, input component |
| Commercial | customer, order, order item, price, demand forecast, availability, shipment, packing |
| Finance | invoice, bill, expense, payment, bank account, bank statement line, fiscal authorisation, CAI number, exchange rate |
| Inventory | material, stock movement, box weight |
| People | worker, timesheet, supplier, purchase order |

Every table's primary column is a Dataverse autonumber (`SH-0001`, `PLT-0001`).
The mapping from the app's own field names to Dataverse columns lives in one
place: [`src/services/tableMap.ts`](src/services/tableMap.ts).

---

## Architecture worth knowing

**One store seam.** Pages keep a plain `[rows, setRows]` shape via
`useRecords(table, [])`. Underneath, the whole array is diffed by id and turned
into per-record creates, updates and deletes — see
[`src/services/syncPlan.ts`](src/services/syncPlan.ts). A row carrying an id the
store never issued is a **create**, not an update.

**Blanks are not empty strings.** An untouched form field arrives as `""`.
Dataverse accepts that on text and rejects it with a 400 on a date, number,
choice or boolean — and the 400 fails the whole record.
[`src/services/payload.ts`](src/services/payload.ts) decides what a blank means
per column kind. This is the single most important thing to preserve.

**Choices and lookups are translated.** Choice columns hold integers, not
labels; a lookup cannot be written as `_bv_bedid_value` and needs
`"bv_BedId@odata.bind": "/bv_beds(<guid>)"`. Both maps are generated from live
metadata into `src/services/choiceMap.generated.ts`.

**Failures are visible.** A rejected write reports through
`src/services/writeErrors.ts` into a banner naming the table and the reason. A
render-time exception is caught by `ErrorBoundary` rather than blanking the app.

**Insight lives in services, not components.** Each module's figures come from a
small pure module with its own tests — `laborInsight`, `accountingInsight`,
`salesInsight`, `supplierInsight`, `nutritionInsight`, `infrastructureInsight`,
`productionInsight`, `availabilityInsight`, `varietySupply`, `stock`.

---

## Local development

```bash
npm install

# Demo mode — LocalStore, no Dataverse. Seeds are deliberately empty.
npm run dev

# Live data. `hostingMode()` reads VITE_DATAVERSE_URL at BUILD time; if it is
# unset when you build, the deployed app silently falls back to LocalStore.
npm run dev:dv
```

`.env.local`:

```
VITE_DATAVERSE_URL=https://<env>.crm16.dynamics.com
```

The SDK takes its session from the Power Apps host and ignores env tokens — to
run locally against real data, use the Local Play URL that `npm run dev` prints.

`pac` and the Power Apps CLI need `DOTNET_ROOT=$HOME/.dotnet` on this machine.

---

## Checks

```bash
npm test                            # 305 assertions, 13 pure-logic suites
npm run test:smoke                  # builds, opens all 11 modules in chromium,
                                    #   fails on any console error or blank screen
npm run build                       # tsc -b && vite build
npm run lint

npm run dataverse:check             # every choice label the app can send is one Dataverse accepts
npm run dataverse:check-columns     # every displayed column exists in its binding
npm run dataverse:check-writes      # all 72 save/delete handlers reach a store
npm run dataverse:check-blank-saves # a half-filled form saves on all 45 tables (live)
npm run dataverse:verify-writes     # create/patch/delete per table (live)
npm run dataverse:census            # row count per table (live)
```

The live checks create and immediately delete probe records.

---

## Dataverse schema

```bash
npm run dataverse:dry-run    # preview what would change
npm run dataverse:apply      # apply schema, then regenerate docs and choice maps
npm run dataverse:docs       # regenerate dataverse/DATA_MODEL.md
npm run dataverse:choices    # regenerate choice + lookup maps from live metadata
npm run dataverse:rowtypes   # regenerate row interfaces and column kinds
```

**Generated files — never edit by hand:** `dataverse/DATA_MODEL.md`,
`src/services/choiceMap.generated.ts`, `src/services/rowTypes.generated.ts`,
`src/services/columnKinds.generated.ts`. Change the schema or the binding and
regenerate, or the document and the database will disagree.

### Data maintenance

```bash
npm run dataverse:purge      # preview; add -- --yes to delete. Keeps exchange
                             #   rates, components, shadehouse, fields, beds
npm run dataverse:seed-fix   # set each autonumber to one past the highest issued
```

`seed-data.mjs` writes **demo** data. It is history, not something to run on a
live nursery.

---

## Deploy

```bash
npm run build
npx power-apps push
```

---

## Open work

See [`BACKLOG.md`](BACKLOG.md). The largest cluster is accounting and sales:
generating an invoice creates no record, payments do not settle invoices, and
orders have no lines.
