# Backlog

What is open, as of **2026-08-29**. Items are grouped by whether they need a
decision, a build, or something entered. Anything here is understood — nothing
is parked for want of analysis.

A shareable version of this document lives at
<https://claude.ai/code/artifact/7e8688fe-22df-41e0-9658-f3838177f593>.

**Counts:** 7 blocked on Santiago · 7 decisions · 6 builds · 4 watching.

---

## Accounting & sales

The screens exist and every table writes, but the chain from
*shipment → invoice → receivable → payment* is not joined up. Three of the joins
need a decision before they can be built.

### ACC-1 · Generating an invoice produces a PDF and no record — **decision**

The invoice screen builds the document correctly — real CAI, real prices, real
customer — and then `onGenerate` writes it to the browser console. No
`bv_invoice` row is created, the CAI number is not marked issued, and nothing
links it to the shipment. The next invoice would be offered the same number.

**Decide:** should Generate be one action that creates the AR record, consumes
the CAI number and attaches the PDF to the shipment? That is the recommendation
unless the steps are deliberately separate.

Files: `src/components/InvoiceGenerator.tsx`, `src/components/ShipmentDetail.tsx`,
`src/hooks/useInvoiceNumber.ts`.

### ACC-2 · Payments do not settle invoices — **decision**

An invoice's balance is whatever was typed on it. Recording a payment does not
reduce it. The arithmetic exists — `paidAgainst()` in `services/invoiceMath.ts`,
already used by the dashboard — and the Accounting screen does not apply it.

**Decide:** are payments allocated to specific invoices (allows partial payments
and a trustworthy ageing), or are balances adjusted by hand?

### ACC-3 · Orders have no lines — **decision**

`bv_OrderItem` exists in Dataverse — order, plant, quantity, unit price, line
total — and nothing in the app reads or writes it. It is deliberately absent from
`tableMap.ts`.

The consequence is that no screen can say *"shipped 8,000 of the 10,000
promised"*. The fulfilment bar was removed from the shipment screen for exactly
this reason: it was a percentage of a number nobody had entered.

**Decide:** does an order carry lines per variety and size, or is the demand
forecast already the order? If the forecast is the order, fulfilment is wired to
that and `bv_OrderItem` stays unused.

### ACC-4 · The real fiscal authorisation must be entered — **blocked**

The seeded CAI was demo data and is deleted — range
`000-001-01-00001461`–`1530`, RTN `05019011379855`, expiring 06-04-2027.
Nothing can be invoiced until the authorisation SAR actually issued is entered
under *Accounting → Fiscal*.

Once entered, the app issues numbers strictly in order and refuses to invoice
against an exhausted or expired range (`services/fiscalNumbering.ts`).

### ACC-5 · Export sales and ISV — **decision**

The invoice was applying 18% ISV; Honduras is 15% and that is corrected
(`ISV_RATE`). Exports are normally zero-rated, and the invoice layout already has
a line for an exonerated subtotal that nothing fills.

**Decide:** which customers or lines are exonerated, and does the printed invoice
need to show the exonerated subtotal separately?

### ACC-6 · Which exchange rate an invoice locks to — **decision**

Invoices are priced in dollars, costs are in lempira, and the central-bank rate is
live with 400 days of history behind it. Conversion currently always uses the
latest rate, so a receivable raised in March changes value every day.

**Decide:** lock the rate on the invoice's own date and store it on the record —
the recommendation, and the reason the rate history was kept — or keep converting
at today's rate.

### SLS-1 · An unpriced variety silently invoices at $0.020 — **build**

Prices are held per variety, season and customer. When a packed variety has no
price on file, the invoice falls back to two cents a cutting rather than stopping.

**Proposed:** refuse to generate and name the varieties that need pricing.

### SLS-2 · Shipment → invoice → receivable is not one flow — **build**

Follows ACC-1 and ACC-2. Once those are decided, this is the build that joins
them: pack boxes, generate, and the receivable appears in Accounting already
ageing.

---

## Data to enter — **blocked on Santiago**

Every table is empty except the shadehouse, four fields, 120 ground beds, the
exchange-rate history and the nutrient chemistry. Roughly this order — later
screens read the earlier ones, so entering out of order leaves dropdowns empty.

**First, because everything else depends on them**

1. **Season** — start and end dates; the name generates itself (`2026-S2`).
2. **Plant varieties** — plants per bed, weeks to first harvest, productive weeks.
   Bed capacity is derived from these, which is why it varies by variety.
3. **Fiscal authorisation** — see ACC-4. Blocks all invoicing.

**Then**

4. **Customers** — including billing address, tax ID and phone; the invoice prints them.
5. **Workers and suppliers** — hourly and piece rates; supplier category drives the
   single-sourcing figure.
6. **Materials and opening stock** — drip line, boxes, baskets, plumbing, shading,
   then one *Received* movement each to set what is on hand.
7. **Bank accounts** — opening balances, each in its own currency.

**When ready**

8. **Air beds** — levels 1–3 above a named ground row, e.g. `E3-01-1`. None exist.
9. **Bed compositions** — substrate materials first, then the percentage mix per bed.

---

## Platform & housekeeping

### OPS-1 · The central-bank API key still needs rotating — **blocked**

`01649a228b11430ca68959bcb1755191` was shipped inside the browser bundle in every
deploy before it was caught. It can no longer be bundled (`BCH_API_KEY`, no `VITE_`
prefix) and the browser client is gone, but the key is unchanged, so anyone who
took a copy still has a working one. Deferred once already; the only outstanding
security item.

### OPS-2 · The app is not in a solution — **decision**

It lives unmanaged in the DEV environment. There is no packaged way to move it to
production, and no way to restore it if lost.

**Decide:** does this stay in Enterprise DEV, or does Broton Verde get its own
production environment? The answer changes how tables and app are packaged.

### OPS-3 · Stale personal flow — **watching**

`e206cf2a-c439-49c0-9b1b-1333df4ead4e`, superseded by the solution copy
`3a7f1e64…`. Provably unused; delete when the environment is tidied.

### OPS-4 · Generated row types are not adopted everywhere — **build**

Every table now has an interface generated from the Dataverse schema
(`rowTypes.generated.ts`), so a page reading a column that does not exist fails to
compile. Several pages still pass records through `as never` to reach the KPI
services, which skips that check. The 96 pre-existing `any` lint errors sit behind
the same clean-up.

### OPS-5 · `bv_Calendar` is unused — **watching**

A date dimension — ISO week, quarter, month name — created, never populated, never
read. Weeks are calculated in the app. Delete it if nothing will use it, so the
model stops implying it matters.

---

## Parked, waiting on something

### PRK-1 · The 3D shadehouse view — **blocked on one observation**

Now draws the real bed set instead of an invented one, including only the cable
levels that actually exist. Whether it renders in the Power Apps player is still
unknown.

**The one diagnostic that unblocks it:** open *Infrastructure → Shadehouse → 3D*
in the player and note what appears.

| Observation | Meaning | Response |
| --- | --- | --- |
| "3D view unavailable" | WebGL genuinely walled off by the player sandbox | Build the isometric fallback |
| Blank white box | WebGL works, the scene fails after init | Ordinary debugging |

If WebGL is walled off, the recommended answer is an isometric 2.5D view in SVG —
no WebGL, so it cannot be blocked. Beds drawn at an angle with real height, air
levels stacked above ground, the existing `PLAN_COLORS` palette. Loses free
rotation; keeps labels, compass, irrigation state and the weather layer.

Rejected alternatives: hosting on Azure (the standalone path was removed on
2026-08-28 because it duplicated the whole data layer — it is in the history but
would need reworking); dropping the tab (a real option if nobody opens it).

Files: `ShadehouseScene.tsx`, `ShadehouseView3D.tsx`, `WebglGuard.tsx`.

### PRK-2 · Bed counts do not roll into customer projections — **build**

Beds are counted in the field week by week, which is the honest number.
Projections shown to customers are still typed by hand, so the two can disagree.
The grid and the arithmetic exist; the roll-up needs real counts to build against.

### PRK-3 · Product type and cutting type are recorded nowhere — **decision**

Packing type and bundle size were unmapped and silently dropped on every save;
both are fixed. Two more columns exist on the same table — product type (`URC`)
and cutting type (`L/E`) — and the packing form does not offer them, so the
invoice prints them as fixed text.

**Decide:** do these vary per box? If so they belong on the packing form.

### PRK-4 · The irrigation layer is simulated — **watching**

Drawn from bed geometry rather than from recorded irrigation lines. It illustrates
rather than reports. Worth saying so on the screen, or replacing once the
irrigation layout is recorded.

---

## Closed 2026-08-29

- **Saving works.** A blank date, number or choice made Dataverse reject the whole
  record with a 400 — one untouched field threw away the entire form — and the
  failure vanished into an uncaught promise. All 45 tables now accept a
  half-filled form (`dataverse:check-blank-saves`).
- **Failed writes are visible** — a banner names the table and the reason.
- **Demo data deleted** — 299 rows across 35 tables.
- **The invented nursery is gone** — `generateBeds()` produced 120 beds with
  invented varieties, planting dates and pest warnings, feeding the map, the
  waffle and the dashboard insight. All three now read real records.
- **Fabricated bed histories removed** — 15–25 activities per bed from a hash of
  its name.
- **The invoice is no longer someone else's** — 70 invented CAI numbers, a
  six-variety price map, and another company's address, tax ID and contact.
  ISV corrected from 18% to 15%.
- **Frozen dates removed** — Labour measured "today" against 2026-04-10,
  Availability against week 15, Accounting against 30 April at a flat 25 HNL/USD.
- **Shipments rebuilt** on `bv_shipments` + `bv_packings`, with filtering, edit,
  delete, a status flow, and every box carrying the bed it was cut from.
- **KPIs and a visual on every module**, each backed by a tested service.
- **Dashboard duplicate "Shadehouse 1" rows** replaced by harvest per field.
- **The blank screen on every module.** Emptying the demo seeds left
  `initRows[0]` undefined and `useFormModal` called `Object.entries` on it inside
  a useState initialiser, which unmounted the app. Guarded, plus an
  `ErrorBoundary` so a render fault shows a message rather than a white page, and
  `npm run test:smoke` — a headless browser that opens all 11 modules and fails on
  any console error. Verified by reintroducing the fault: the test catches it.
- **A circular import** between `ShadehouseView` and `useShadehouseBeds`; the
  shared geometry now lives in `services/shadehouseLayout.ts`.
