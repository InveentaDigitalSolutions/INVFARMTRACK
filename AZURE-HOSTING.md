> **Not in use, and not currently possible.** The `standalone` hosting mode this
> document describes — MSAL sign-in calling the Dataverse Web API directly — was
> removed from the code on 2026-08-28 because it duplicated the whole data layer.
> `hostingMode()` now returns only `player` or `demo`.
>
> The GitHub Actions workflow that deployed to Azure Static Web Apps on every
> push to `main` was **deleted on 2026-08-29**: it was building an app whose
> sign-in path no longer exists, and firing on every commit. The app is deployed
> to Power Apps with `npx power-apps push`, and nothing else.
>
> This document is kept as the record of how standalone hosting worked. Reviving
> it means restoring the MSAL data path first — see BACKLOG.md, PRK-1, where an
> isometric SVG view is the recommended route to a 3D-like plan instead.

---

# Standalone hosting on Azure

Why: the Power Apps player sandboxes the app — `connect-src 'none'`,
`worker-src 'none'`, `style-src 'self'`. That blocked the weather API, broke
troika's text worker (which the 3D scene needs), and corrupted web fonts.
Hosted on Azure there is no sandbox, so the 3D view and direct API calls work
the way they do in local development.

The app supports **both** hosting models from one codebase. `hostingMode()` in
`src/services/tableMap.ts` decides at runtime:

| Mode | Trigger | Data path |
|---|---|---|
| `standalone` | `VITE_ENTRA_CLIENT_ID` + `VITE_ENTRA_TENANT_ID` set | MSAL sign-in → Dataverse Web API |
| `player` | `VITE_DATAVERSE_URL` only | Power Apps host session → SDK |
| `demo` | neither | LocalStore, no Dataverse |

## One-time setup

### 1. Entra app registration

```bash
az ad app create --display-name "INV FarmTrack" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "https://<your-swa>.azurestaticapps.net" "http://localhost:5173"
```

Then, on that registration:

- **Authentication** → add a *Single-page application* platform with the same
  redirect URIs. SPA is required; MSAL v5 uses the auth-code + PKCE flow.
- **API permissions** → add **Dynamics CRM → user_impersonation** (delegated),
  then grant admin consent.

### 2. Dataverse CORS

In the Power Platform admin centre, allow the Static Web App origin to call the
Web API, or register the SPA origin on the environment. Without this the
browser blocks the cross-origin call before it reaches Dataverse.

### 3. Azure Static Web App

```bash
az staticwebapp create -n inv-farmtrack -g <resource-group> \
  -s https://github.com/InveentaDigitalSolutions/INVFARMTRACK \
  -b main --login-with-github
```

### 4. GitHub secrets

| Secret | Value |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | from the Static Web App's deployment token |
| `ENTRA_CLIENT_ID` | the app registration's client id |
| `ENTRA_TENANT_ID` | `47176c00-abb5-4125-8ce3-a795dffd8b87` |
| `DATAVERSE_URL` | `https://enterprisedev.crm16.dynamics.com` |

`.github/workflows/azure-static-web-apps.yml` builds and deploys on every push
to `main`, and gives each pull request a preview environment.

## Running standalone locally

Put the same three values in `.env.local`:

```
VITE_ENTRA_CLIENT_ID=<client id>
VITE_ENTRA_TENANT_ID=47176c00-abb5-4125-8ce3-a795dffd8b87
VITE_DATAVERSE_URL=https://enterprisedev.crm16.dynamics.com
```

`npm run dev` then signs in with MSAL and reads Dataverse directly — the same
path as production, without deploying.

## What licensing does NOT change

Dataverse API access still requires Power Apps or Dynamics licences per user.
Hosting elsewhere changes the sandbox, not the licence model.
