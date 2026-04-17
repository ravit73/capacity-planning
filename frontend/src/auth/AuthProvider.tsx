import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { MsalProvider, useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, loginRequest } from "./authConfig";
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

// ── Public export ──────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!AUTH_ENABLED) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }
  return (
    <MsalProvider instance={msalInstance}>
      <MsalAuthProvider>{children}</MsalAuthProvider>
    </MsalProvider>
  );
}
