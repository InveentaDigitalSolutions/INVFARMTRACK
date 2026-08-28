# Backlog

Work that is understood and deliberately deferred. Anything here has been
discussed and parked — it is not forgotten and not blocked on analysis.

---

## Track B — 3D shadehouse view

**Parked 2026-08-28.** Deferred by Santiago; revisit after the modules and
accounting are done.

The 3D tab renders nothing in the deployed Power Apps player. The scene works
in principle — the CSP fixes for troika's web worker and the inlined fonts are
already in — but something after that still fails.

**The one diagnostic that unblocks it:** open the 3D tab in the player and note
whether it shows the `WebglGuard` message *"3D view unavailable"* with a reason,
or a blank white box.

| Observation | Meaning | Response |
| --- | --- | --- |
| "3D view unavailable" | WebGL genuinely unavailable in the player sandbox | Build the isometric fallback |
| Blank white box | WebGL works, our scene fails after init | Ordinary debugging |

**If WebGL is walled off, the recommended answer is an isometric 2.5D view in
SVG.** No WebGL, so it cannot be blocked. Beds drawn at an angle with real
height, air levels stacked above ground, the existing `PLAN_COLORS` palette.
Loses free rotation; keeps labels, compass, live irrigation state and the
weather layer.

Rejected alternatives, and why:

- **Host on Azure** — full WebGL, but leaves the Power Platform: separate
  hosting, sign-in, deployment and running cost. Weighed in August 2026 and
  declined.
- **Drop the tab** — a real option if nobody opens it during module testing.

Related: `src/components/ShadehouseScene.tsx`, `ShadehouseView3D.tsx`,
`WebglGuard.tsx`.

---

## Smaller items

- **Stale personal flow** `e206cf2a-c439-49c0-9b1b-1333df4ead4e` — superseded by
  the solution copy `3a7f1e64…`. Provably unused; delete once confirmed.
- **BCH exchange rate** — likely still showing the hardcoded `26.5543` fallback
  rather than a live figure. Needs routing through a flow like the weather.
- **Irrigation layer is simulated** — the 3D/2D irrigation state is generated,
  not read from `bv_irrigation`. Point it at real data and add the write-back
  flow (inside the solution, not personal).
- **Dashboard shows "Shadehouse 1" three times** — duplicate labels.
- **Code app is not in the solution** — `power-apps push` creates it in the
  environment only. May be a preview limitation; confirm whether the app can be
  added to `BrotonVerdeNursery` at all.
