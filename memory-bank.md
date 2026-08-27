# INV FarmTrack — Project Memory

## Project
- **Name:** INV-FarmTrack (Broton Verde Nursery)
- **Type:** Power Apps code app (React 19 + Vite 7 + TypeScript)
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
- **Last deployed:** 2026-08-27

## Data
- 36 Dataverse tables, 466 columns, 46 relationships — see `dataverse/DATA_MODEL.md` (generated; run `npm run dataverse:docs` after any schema change)
- Every table's primary column is an autonumber: `SH-0001`, `PLT-0001`, …
- 7 tables read live Dataverse via `src/services/tableMap.ts` → `ENABLED_TABLES`;
  the rest stay on LocalStore until they have seeded rows

## Gotchas
- `pac` and the CLI need `DOTNET_ROOT=$HOME/.dotnet` on this machine
- The SDK takes its session from the Power Apps host and ignores env tokens —
  local runs against real data use the Local Play URL that `npm run dev` prints
- Code apps must be enabled per environment in the Power Platform Admin Center;
  the first push failed with `CodeAppOperationNotAllowedInEnvironment`
