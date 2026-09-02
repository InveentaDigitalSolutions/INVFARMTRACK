# INV FarmTrack — how to work on this repo

Digital Nursery Intelligence for **Broton Verde**, an ornamental plant nursery
in El Olvido, Santa Cruz de Yojoa, Honduras. They export unrooted cuttings,
today entirely by air.

This is a **Power Apps code app** — React 19 + Vite + Tailwind + TypeScript,
deployed with the `@microsoft/power-apps` SDK. It is **not** a canvas app:
never reach for the canvas-authoring MCP here.

---

## The one trap that has already broken production

`hostingMode()` reads `VITE_DATAVERSE_URL` **at build time**. Unset, the app
silently falls back to the browser's local storage: every screen renders and
every table is empty. A demo-mode build was deployed once and the nursery lost
sight of all its data until it was noticed.

The screenshot harnesses build in demo mode **on purpose**
(`VITE_DATAVERSE_URL= npx vite build --mode development`), so `dist/` is
frequently not shippable. Never push what happens to be lying there.

```
npm run deploy      # build → check the target → check the sandbox → push
```

Use that, not `npx power-apps push` on its own. `npm run check-build` alone
tells you what the current `dist/` would talk to. The running app prints
`[build] BUILD_TARGET:dataverse` in the console for the same reason.

## Before shipping anything

```
npm test                        # ~25 plain tsx scripts, no framework
npm run test:smoke              # opens all 11 modules in a browser, fails on console errors
npm run test:rows               # deleting a row deletes THAT row (browser)
npm run test:sandbox            # nothing in the bundle reaches an external host
npm run dataverse:check-reads   # every table the app reads is mapped and enabled
npm run dataverse:check-columns # every displayed column exists in its binding
npm run dataverse:check-writes  # every save handler reaches a store
```

Tests are ordinary scripts under `scripts/test/`. They print what they checked
in the nursery's language, not `expect().toBe()`. New behaviour gets one.

## Looking at the 3D view

A layout is visual; unit tests pass on visibly wrong scenes. The harnesses take
real screenshots:

```
VITE_DATAVERSE_URL= npx vite build --mode development   # required first
NOSHADE=1 CLIP=1 node scripts/test/shot3d.mjs out.png
```

Flags: `TERRAIN SUN SUNHOUR ZOOM ZOOMOUT ORBIT TILT PICK DARK NOSHADE CLIP FULL PLAN`.
Turn **Shade off** before judging lighting — the cloth is on by default and its
panels look exactly like missing shadows. Rebuild for production afterwards.

## Dataverse

Schema source of truth is `dataverse/farmtrack.dataverse.schema.json`.

```
node scripts/dataverse/apply-schema.mjs --dry-run   # then without --dry-run
npm run dataverse:rowtypes && npm run dataverse:choices && npm run dataverse:docs
```

Re-run the dry run afterwards and confirm it reports nothing outstanding —
grepping the apply output has hidden a missed column before.

Three ways it will mislead you:

- **`$top` and paging are mutually exclusive.** `$top=5000` returns 5,000 rows
  and no next link, which reads as the whole table. Page with
  `Prefer: odata.maxpagesize` and follow `@odata.nextLink`.
- **A failed read is not an empty table.** `page.value ?? []` turns a 404 into
  "nothing there yet". Check `res.ok` and throw.
- **Entity set names are guessed by Dataverse and cannot be changed later**
  (`bv_Holiday` → `bv_holidaies`). Set `entitySetName` in the schema up front.

A new table must also be registered with the code app:

```
npx power-apps add-data-source --non-interactive -a dataverse -t bv_<logicalname> -u <org url>
```

— the **logical** name, not the entity set.

## Rules learned the hard way

- **Act on rows by id, never by position.** A list can reload between the click
  and the confirmation, and Dataverse does not promise a stable order. See
  `withoutPending` / `withEdited` in `src/hooks/useFormModal.ts`.
- **Say when a write fails.** A row that leaves the screen and returns on the
  next read looks like a dead button. `useRecords` reports refusals and checks
  that deletes actually took.
- **Comments explain why, not what** — and especially what went wrong before,
  because the next person will otherwise undo the fix.
- The customer's own words beat any document. A shared PDF or spec is additive
  detail; it never overrides working code or what Santiago says on the phone.

## What is open

`BACKLOG.md`, grouped by whether an item needs a decision, a build, or data
entered. Keep it current; it is what the nursery reads.

## If you are running in the cloud

A cloud session has the code and nothing else: no `.env.local`, no Power
Platform auth, no `pac`, no BCH key. So you can read, edit, run `npm test` and
open a PR — you **cannot** build in Dataverse mode, deploy, or touch DEV data.
Do not try, and do not leave a demo-mode `dist/` behind. Say plainly in the PR
that it is unverified against the live app.
