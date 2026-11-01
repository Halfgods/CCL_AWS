import { UserManager, WebStorageStateStore } from "oidc-client-ts";

/**
 * Cognito settings come from the shared root .env file.
 * Vite only exposes variables prefixed with VITE_ to the browser, so the
 * authority and client ID are safe to reference here. No secret is used:
 * this is a public single-page-application client with no client secret.
 */
const authority = import.meta.env.VITE_COGNITO_AUTHORITY;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

if (!authority || !clientId) {
  throw new Error(
    "Missing VITE_COGNITO_AUTHORITY or VITE_COGNITO_CLIENT_ID. " +
      "Copy .env.example to .env at the repository root and rebuild the app."
  );
}

const settings = {
  authority,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid email profile",
  userStore: new WebStorageStateStore({
    store: window.sessionStorage,
  }),
};

export const userManager = new UserManager(settings);

export async function login() {
  await userManager.signinRedirect();
}

export async function logout() {
  await userManager.signoutRedirect();
}

export async function getAccessToken() {
  const user = await userManager.getUser();

  if (!user || user.expired) return null;

  return user.access_token;
}
