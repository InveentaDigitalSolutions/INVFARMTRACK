# Backlog

What is open, as of **2026-08-31**. Items are grouped by whether they need a
decision, a build, or something entered. Anything here is understood — nothing
is parked for want of analysis.

A shareable version of this document lives at
<https://claude.ai/code/artifact/7e8688fe-22df-41e0-9658-f3838177f593>.

**Counts:** 6 blocked on Santiago · 1 decision · 8 builds · 3 watching.

---

## Accounting & sales

The screens exist and every table writes, but the chain from
*shipment → invoice → receivable → payment* is not joined up. Three of the joins
need a decision before they can be built.

### SLS-3 · A product is not one thing — **decided, partly built**

Santiago's question: how do you choose a packing type when building a packing
list? You cannot, and the reason is structural.

Three tables describe the same product and none of them are joined:

- **`bv_PlantSize`** says what a box of a variety at a size holds — the
  catalogue row.
- **`bv_Packing`** types its own size, type and product free-hand on every box,
  pointing at nothing. So a packed box is not connected to the catalogue row
  that says what that product *is*, and there is nothing to pick from.
- **`bv_PlantPrice`** is per plant, season and customer and carries **no size
  at all**. A Large and a Petit cutting of the same variety can only hold one
  price, and their boxes differ by two and a half times in count alone.

**Proposed:** make `bv_PlantSize` the product definition — variety × size ×
type × product — and have Packing and Price both point at it. Packing then picks
a product and inherits its box count and bundle; a price is always a price for a
specific thing. SLS-1 disappears with it: an unpriced product cannot be
invoiced at two cents by accident, because there is a row that either has a
price or does not.

Answered: price is keyed on variety, customer, port and product, and on size in
future. Built — `services/priceResolver.ts` picks the most specific row that
applies and **returns null rather than a number it is not sure of**. Only L&E is
sold today; the other products exist in the model so the list does not have to
be rebuilt when they arrive.

### ACC-1 · Generating an invoice produces a PDF and no record — **decided, to build**

The invoice screen builds the document correctly — real CAI, real prices, real
customer — and then `onGenerate` writes it to the browser console. No
`bv_invoice` row is created, the CAI number is not marked issued, and nothing
links it to the shipment. The next invoice would be offered the same number.

**Decide:** should Generate be one action that creates the AR record, consumes
the CAI number and attaches the PDF to the shipment? That is the recommendation
unless the steps are deliberately separate.

Files: `src/components/InvoiceGenerator.tsx`, `src/components/ShipmentDetail.tsx`,
`src/hooks/useInvoiceNumber.ts`.

### ACC-2 · Payments do not settle invoices — **decided, to build**

An invoice's balance is whatever was typed on it. Recording a payment does not
reduce it. The arithmetic exists — `paidAgainst()` in `services/invoiceMath.ts`,
already used by the dashboard — and the Accounting screen does not apply it.

**Decide:** are payments allocated to specific invoices (allows partial payments
and a trustworthy ageing), or are balances adjusted by hand?

### ACC-3 · Orders have no lines — **decided, awaiting the order spreadsheet**

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

### ACC-5 · Export sales and ISV — **decided: none exonerated**

The invoice was applying 18% ISV; Honduras is 15% and that is corrected
(`ISV_RATE`). Exports are normally zero-rated, and the invoice layout already has
a line for an exonerated subtotal that nothing fills.

**Decide:** which customers or lines are exonerated, and does the printed invoice
need to show the exonerated subtotal separately?

### ACC-6 · Which exchange rate an invoice locks to — **decided, to build**

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

### OPS-2 · ALM: DEV, INT, PROD — **decided, later**

It lives unmanaged in the DEV environment. There is no packaged way to move it to
production, and no way to restore it if lost.

Santiago is setting up DEV / INT / PROD, but deliberately after a working
prototype with real data in DEV. So: stay unmanaged in DEV for now, and package
when the prototype holds. Until then there is no way to restore the app if it is
lost, which is the cost of that order and worth knowing.

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

### PRK-1 · The 3D shadehouse view — **fixed 2026-08-29**

Moved to Closed. The cause was found by serving the build under the player's
Content-Security-Policy rather than by guessing: drei's `<Text>` is
troika-three-text, which fetches a unicode font index from `cdn.jsdelivr.net`
at render time. `connect-src 'none'` refuses it, the rejection lands inside
typesetting, and the **whole scene** fails — which is why the tab was blank
rather than merely unlabelled.

Pointing troika at a self-hosted font would not have helped: it still has to
`fetch` the file. Labels are now drawn on a 2D canvas and used as textures —
no network, no worker, no font loading. `npm run test:sandbox` fails the build
if any CDN reference returns.

The isometric SVG fallback is no longer needed. WebGL itself was never the
problem.

### PRK-2 · Bed counts do not roll into customer projections — **build**

Beds are counted in the field week by week, which is the honest number.
Projections shown to customers are still typed by hand, so the two can disagree.
The grid and the arithmetic exist; the roll-up needs real counts to build against.

### PRK-3 · Product type and cutting type are recorded nowhere — **decision**

Packing type and bundle size were unmapped and silently dropped on every save;
both are fixed. Two more columns exist on the same table — product type (`URC`)
and cutting type (`L/E`) — and the packing form does not offer them, so the
invoice prints them as fixed text.

Both now live on `bv_PlantSize` with the full vocabulary — Product takes L&E, E,
Bulbs and Tips; Type takes URC and RC — so a product is defined once and the
packing line points at it.

**Decide:** can a single box ever differ from its product's definition — a box
of Tips packed against an L&E product row? If never, packing inherits them and
the free-hand fields come off the form entirely.

### PRK-5 · A measurements layer for the 3D view — **build**

Bed and road dimensions written on the plan, so the view can be read as a
drawing rather than only looked at. Asked for; not built.

The two things next to it are done: the **Terrain** layer paints the survey's
contours flat on the floor (`services/terrain.ts` + `terrainTexture.ts`), and
the dashboard's rate chip opens its **history** over 3M / 6M / 1Y.

### PRK-8 · A variety that can only be grown in a basket — **closed 2026-08-31**

`bv_Plant.bv_GrownIn` records it: Ground, Basket, or both. The planting picker
filters by kind, so a basket-only variety is no longer offered a ground bed by
an interface that could not tell the difference.

### PRK-7 · Light per bed is clear-sky only — **build**

`services/bedLight.ts` gives each bed its daily light integral from the sun's
path and its cloth: about 18 mol/m²/day under single shade at the equinox, 6.4
under double, 2.2 under triple. That is the light available when nothing is in
the way but air and cloth.

**Cloud is done.** The weather flow returns Open-Meteo's daily radiation for the
last 92 days and the next 7, and light per bed uses the measurement wherever
there is one — the panel says "light that day" and gives the cloud fraction, or
"light (clear sky)" where it is falling back. Recent days here ran 88-93% of
clear sky.

What is left:

- **A store.** The window is 92 days. A planting older than that accumulates on
  clear-sky assumptions for its early life. Persisting the daily figure the way
  `bv_exchangerates` is persisted would fix it permanently.
- **Structure.** Air beds shade the ground beds beneath them. The renderer
  handles it — a slab at air-bed height casts correctly — but the *arithmetic*
  does not, and no air beds are recorded yet, so today the cloth is still the
  only term that varies between beds.

Then `accumulatedLight()` over a planting's life is what a growth model should
count in, instead of calendar days.

### PRK-6 · Posts cast no shadow — **watching, fixed 2026-08-30**

Shadows do work. The earlier reading — "nothing casts one" — was wrong: the dark
bands taken for shadows were the shade-cloth panels, and with that layer off a
test caster shadowed the beds clearly.

What was actually wrong was the shadow map: allocated at its default over a
house 115 m across. It is now 4096 with the frustum fitted to the block, giving
2.8 cm per texel, and **anything bed-sized or larger casts properly** — verified
with a 1.5 x 30 m slab at air-bed height, which shadows the ground bed beneath
it. That is the case that matters, because it is a real term in the light a crop
receives.

The 15 cm posts still do not resolve: a silhouette five texels wide does not
survive filtering at a low sun. Their shadows are physically negligible over a
1.2 m bed, so this is left rather than chased with a second shadow cascade.

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
- **The 3D view renders in the player.** Reproduced the sandbox by serving the
  build under the player's CSP, which found the CDN font fetch that was taking
  the scene down. Labels are canvas textures now. Two further faults fixed
  alongside it: `Math.max()` over no beds made the ground plane infinite and
  every vertex NaN, and a field absent from the measured plan geometry threw
  inside `placeBeds` — so adding one new field would have blanked the view
  again. Unfamiliar fields are now laid out in their own band.
