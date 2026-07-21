import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, msalConfigValid, loginRequest } from "./authConfig";
import { AuthContext, AuthContextValue } from "./AuthContext";
import { AppUser } from "../types";
import { setTokenProvider } from "../hooks/useApi";

const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED !== "false";

// ── Dev-mode provider (no MSAL, always admin) ──────────────────────────────
function DevAuthProvider({ children }: { children: ReactNode }) {
  const devUser: AppUser = {
    id: 0,
    azure_oid: "dev",
    email: "dev@local",
    display_name: "Dev Admin",
    role: "admin",
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const value: AuthContextValue = useMemo(
    () => ({
      user: devUser,
      loading: false,
      isAuthenticated: true,
      getAccessToken: async () => null,
      login: () => {},
      logout: () => {},
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── MSAL-backed provider ───────────────────────────────────────────────────
function MsalAuthProvider({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = accounts[0] ?? null;
  const [user, setUser] = useState<AppUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!account) return null;
    try {
      const result = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        instance.acquireTokenRedirect({ ...loginRequest, account });
      }
      return null;
    }
  }, [instance, account]);

  // Register token provider so apiFetch can attach Bearer tokens
  useMemo(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  // Fetch the user record (which includes the role) from the backend
  useEffect(() => {
    if (!account) {
      setUser(null);
      setUserLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setUserLoading(true);
      const token = await getAccessToken();
      if (!token || cancelled) { setUserLoading(false); return; }
      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) setUser(await res.json());
      } catch { /* non-fatal */ } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [account, getAccessToken]);

  const loading = inProgress !== "none" || userLoading;

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!account,
      getAccessToken,
      login: () => instance.loginRedirect(loginRequest),
      logout: () => instance.logoutRedirect(),
    }),
    [user, loading, account, getAccessToken, instance]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Misconfiguration screen ────────────────────────────────────────────────
function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-8 max-w-lg w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-lg font-bold">!</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Azure AD not configured</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The frontend environment variables are missing. Create{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">frontend/.env</code> with:
        </p>
        <pre className="bg-gray-900 text-green-400 text-xs rounded p-4 overflow-x-auto mb-4">
{`VITE_AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id>`}
        </pre>
        <p className="text-xs text-gray-400">
          For local dev without Azure AD, set{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">VITE_AUTH_ENABLED=false</code> instead.
        </p>
      </div>
    </div>
  );
}

// ── Public export ──────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!AUTH_ENABLED) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }
  if (!msalConfigValid) {
    return <MissingConfigScreen />;
  }
  return (
    <MsalProvider instance={msalInstance}>
      <MsalAuthProvider>{children}</MsalAuthProvider>
    </MsalProvider>
  );
}
