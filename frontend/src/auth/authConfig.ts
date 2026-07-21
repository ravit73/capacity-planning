import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string;

export const msalConfigValid = !!(clientId && tenantId && clientId !== "undefined" && tenantId !== "undefined");

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${tenantId || "common"}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes for the backend API — must match what you exposed in Azure AD app registration
export const loginRequest = {
  scopes: [`api://${clientId}/access_as_user`],
};

export const msalInstance = new PublicClientApplication(msalConfig);
