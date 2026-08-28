/**
 * Entra ID authentication for the standalone (Azure-hosted) build.
 *
 * Inside the Power Apps player the host supplies the Dataverse session. Hosted
 * on Azure there is no host, so the app signs the user in itself and calls the
 * Dataverse Web API with a delegated token.
 *
 * Configuration comes from env vars so the same bundle can target another
 * environment without a rebuild:
 *   VITE_ENTRA_CLIENT_ID  — the app registration's client id
 *   VITE_ENTRA_TENANT_ID  — the tenant to sign in against
 *   VITE_DATAVERSE_URL    — e.g. https://enterprisedev.crm16.dynamics.com
 */

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
  type Configuration,
} from "@azure/msal-browser";

export const DATAVERSE_URL = (
  import.meta.env.VITE_DATAVERSE_URL ?? "https://enterprisedev.crm16.dynamics.com"
).replace(/\/+$/, "");

const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID ?? "";
const TENANT_ID = import.meta.env.VITE_ENTRA_TENANT_ID ?? "";

/** Dataverse issues delegated tokens against its own resource, not Graph. */
const DATAVERSE_SCOPE = `${DATAVERSE_URL}/user_impersonation`;

const config: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    // Session storage keeps a shared machine from leaving an account signed in
    // after the tab closes — nursery staff share terminals.
    cacheLocation: "sessionStorage",
  },
};

let app: PublicClientApplication | null = null;
let initialised: Promise<void> | null = null;

/** True when the build is configured for standalone hosting. */
export function isStandaloneAuthConfigured(): boolean {
  return Boolean(CLIENT_ID && TENANT_ID);
}

async function getApp(): Promise<PublicClientApplication> {
  if (!isStandaloneAuthConfigured()) {
    throw new Error(
      "Entra auth is not configured. Set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID."
    );
  }
  if (!app) app = new PublicClientApplication(config);
  if (!initialised) {
    initialised = app.initialize().then(async () => {
      // Completes a redirect sign-in if we have just come back from one.
      await app!.handleRedirectPromise();
    });
  }
  await initialised;
  return app;
}

export async function getAccount(): Promise<AccountInfo | null> {
  const instance = await getApp();
  return instance.getAllAccounts()[0] ?? null;
}

export async function signIn(): Promise<void> {
  const instance = await getApp();
  await instance.loginRedirect({ scopes: [DATAVERSE_SCOPE] });
}

export async function signOut(): Promise<void> {
  const instance = await getApp();
  await instance.logoutRedirect();
}

/**
 * A delegated Dataverse token, refreshed silently where possible.
 * Falls back to a redirect only when the user must genuinely re-consent.
 */
export async function getDataverseToken(): Promise<string> {
  const instance = await getApp();
  const account = instance.getAllAccounts()[0];
  if (!account) {
    await instance.loginRedirect({ scopes: [DATAVERSE_SCOPE] });
    throw new Error("Redirecting to sign in");
  }
  try {
    const result = await instance.acquireTokenSilent({
      scopes: [DATAVERSE_SCOPE],
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await instance.acquireTokenRedirect({ scopes: [DATAVERSE_SCOPE], account });
      throw new Error("Redirecting for consent");
    }
    throw err;
  }
}
