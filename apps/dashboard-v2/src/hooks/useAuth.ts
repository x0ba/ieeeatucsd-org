import { useLogto } from "@logto/react";
import { useMutation, useQuery } from "convex/react";
import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../../convex/_generated/api";
import type { UserRole } from "@/types/roles";
import { resolveAuthState, shouldAttemptProvisioning } from "@/lib/auth/authState";
import { refreshSessionWithRetry } from "@/lib/auth/sessionRefresh";

export type { UserRole };
export type AuthFailureReason =
  | "session_mint_failed"
  | "claims_failed"
  | "user_query_timeout"
  | null;

const isServer = typeof window === "undefined";
const SESSION_MINT_TIMEOUT_MS = 10_000;
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

// Module-level cache to persist auth state across component remounts
// This prevents React Strict Mode and Logto SDK state cycling from clearing auth
let cachedAuthSession: {
  logtoId: string;
  accessToken: string;
  convexSessionToken: string;
  convexSessionExpiresAt: number;
} | null = null;

function getCachedSession() {
  if (!cachedAuthSession) return null;
  // Check if session is still valid (not expired)
  if (Date.now() >= cachedAuthSession.convexSessionExpiresAt) {
    cachedAuthSession = null;
    return null;
  }
  return cachedAuthSession;
}

function setCachedSession(session: typeof cachedAuthSession) {
  cachedAuthSession = session;
}

function clearCachedSession() {
  cachedAuthSession = null;
}

// SSR-safe no-op defaults — useLogto() cannot be called during SSR
// because LogtoProvider is guarded behind a client-only check.
const ssrDefaults = {
  isAuthenticated: false as const,
  isLoading: true as const,
  isAuthResolved: false as const,
  isProvisioningUser: false as const,
  authFailureReason: null as AuthFailureReason,
  user: null,
  userRole: "Member" as UserRole,
  logtoId: null as string | null,
  accessToken: null as string | null,
  convexSessionToken: null as string | null,
  getAuthHeaders: (): Record<string, string> => ({}),
  signIn: () => {},
  signOut: () => {},
};

type AuthContextValue = ReturnType<typeof useAuthClient>;

const AuthContext = createContext<AuthContextValue>(ssrDefaults);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthClient();

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  if (isServer) {
    return ssrDefaults;
  }

  return useContext(AuthContext);
}

function useAuthClient() {
  const {
    isAuthenticated,
    isLoading: logtoLoading,
    signIn,
    signOut,
    getIdTokenClaims,
    getAccessToken,
  } = useLogto();

  // Initialize state from cached session if available
  const cached = getCachedSession();
  const [logtoId, setLogtoId] = useState<string | null>(cached?.logtoId ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(cached?.accessToken ?? null);
  const [convexSessionToken, setConvexSessionToken] = useState<string | null>(cached?.convexSessionToken ?? null);
  const [convexSessionExpiresAt, setConvexSessionExpiresAt] = useState<number | null>(cached?.convexSessionExpiresAt ?? null);
  const [isProvisioningUser, setIsProvisioningUser] = useState(false);
  const [authFailureReason, setAuthFailureReason] = useState<AuthFailureReason>(null);
  const lastProvisioningAttemptRef = useRef<string | null>(null);
  const signOutTriggeredRef = useRef(false);
  const authInitializedRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const upsertUser = useMutation(api.users.upsertFromAuth);

  // Store Logto functions in refs to avoid effect re-runs when they change identity
  const getIdTokenClaimsRef = useRef(getIdTokenClaims);
  const getAccessTokenRef = useRef(getAccessToken);
  getIdTokenClaimsRef.current = getIdTokenClaims;
  getAccessTokenRef.current = getAccessToken;

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!accessToken) return {};
    return { Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  const mintConvexSession = useCallback(
    async (token: string): Promise<{ sessionToken: string; expiresAt: number }> => {
      const response = await fetchWithTimeout("/api/auth/convex-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }, SESSION_MINT_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Failed to mint Convex session (${response.status})`);
      }

      const data = (await response.json()) as {
        sessionToken: string;
        expiresAt: number;
      };
      return data;
    },
    [],
  );

  const clearLocalAuthState = useCallback(() => {
    setLogtoId(null);
    setAccessToken(null);
    setConvexSessionToken(null);
    setConvexSessionExpiresAt(null);
    setIsProvisioningUser(false);
    lastProvisioningAttemptRef.current = null;
    refreshInFlightRef.current = false;
    clearCachedSession();
    // Note: authInitializedRef is only reset when isAuthenticated becomes false
  }, []);

  const markAuthFailure = useCallback(
    (reason: Exclude<AuthFailureReason, null>) => {
      clearLocalAuthState();
      setAuthFailureReason(reason);
    },
    [clearLocalAuthState],
  );

  const origin = window.location.origin;
  const performSignOut = useCallback(
    (reason?: "session-init") => {
      clearLocalAuthState();
      const reasonQuery = reason ? `?reason=${reason}` : "";
      signOut(`${origin}/signin${reasonQuery}`);
    },
    [clearLocalAuthState, origin, signOut],
  );

  // Fetch logtoId from ID token claims when authenticated
  // Only re-run when isAuthenticated changes
  useEffect(() => {
    if (!isAuthenticated) {
      setLogtoId(null);
      setAccessToken(null);
      setConvexSessionToken(null);
      setConvexSessionExpiresAt(null);
      setIsProvisioningUser(false);
      setAuthFailureReason(null);
      lastProvisioningAttemptRef.current = null;
      signOutTriggeredRef.current = false;
      authInitializedRef.current = false;
      refreshInFlightRef.current = false;
      clearCachedSession();
      return;
    }

    // Check if we already have a valid cached session
    const existingSession = getCachedSession();
    if (existingSession) {
      // Restore from cache if state was cleared
      if (!convexSessionToken) {
        setLogtoId(existingSession.logtoId);
        setAccessToken(existingSession.accessToken);
        setConvexSessionToken(existingSession.convexSessionToken);
        setConvexSessionExpiresAt(existingSession.convexSessionExpiresAt);
        setAuthFailureReason(null);
        authInitializedRef.current = true;
      }
      return;
    }

    // Prevent re-initialization if already initialized for this session
    if (authInitializedRef.current && convexSessionToken) {
      return;
    }

    let cancelled = false;
    const loadAuth = async () => {
      try {
        const [claims, token] = await Promise.all([
          getIdTokenClaimsRef.current?.(),
          getAccessTokenRef.current?.(),
        ]);

        if (cancelled) return;
        
        if (!claims?.sub || !token) {
          setAuthFailureReason("claims_failed");
          return;
        }

        setLogtoId(claims.sub);
        setAccessToken(token);

        try {
          const data = await mintConvexSession(token);

          if (cancelled) return;

          // Update state immediately on initial load
          setConvexSessionToken(data.sessionToken);
          setConvexSessionExpiresAt(data.expiresAt);
          setAuthFailureReason(null);
          signOutTriggeredRef.current = false;
          authInitializedRef.current = true;

          // Cache the session for persistence across remounts
          setCachedSession({
            logtoId: claims.sub,
            accessToken: token,
            convexSessionToken: data.sessionToken,
            convexSessionExpiresAt: data.expiresAt,
          });
        } catch (mintErr) {
          if (!cancelled) {
            setAuthFailureReason("session_mint_failed");
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to initialize auth:", err);
          setAuthFailureReason("claims_failed");
        }
      }
    };

    void loadAuth();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authFailureReason) return;
    const hasCoreSession = !!logtoId && !!accessToken && !!convexSessionToken;
    if (hasCoreSession) return;

    const timeout = window.setTimeout(() => {
      markAuthFailure("session_mint_failed");
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, authFailureReason, logtoId, accessToken, convexSessionToken, markAuthFailure]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || authFailureReason) return;
    const timer = window.setInterval(() => {
      // Add grace period: only refresh if within 60 seconds of expiry
      const shouldRefresh = !convexSessionExpiresAt || Date.now() + 60_000 >= convexSessionExpiresAt;
      if (!shouldRefresh || refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;
      void (async () => {
        try {
          const { session, accessToken: latestAccessToken } = await refreshSessionWithRetry({
            currentAccessToken: accessToken,
            getLatestAccessToken: async () => getAccessTokenRef.current?.(),
            mintSession: mintConvexSession,
            maxAttempts: 3,
            baseDelayMs: 750,
          });

          if (latestAccessToken !== accessToken) {
            setAccessToken(latestAccessToken);
          }

          if (session.sessionToken !== convexSessionToken) {
            setConvexSessionToken(session.sessionToken);
          }

          setConvexSessionExpiresAt(session.expiresAt);

          if (logtoId) {
            setCachedSession({
              logtoId,
              accessToken: latestAccessToken,
              convexSessionToken: session.sessionToken,
              convexSessionExpiresAt: session.expiresAt,
            });
          }
        } catch (err) {
          console.error("Failed to refresh Convex session:", err);
          markAuthFailure("session_mint_failed");
        } finally {
          refreshInFlightRef.current = false;
        }
      })();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, accessToken, convexSessionToken, convexSessionExpiresAt, logtoId, mintConvexSession, authFailureReason, markAuthFailure]);

  // convexUser is:
  //   undefined — query still loading (Convex hasn't responded yet)
  //   null      — authenticated but user not found in DB (first sign-in, before callback upsert)
  //   object    — user found in DB
  const convexUser = useQuery(
    api.users.getMe,
    isAuthenticated && logtoId && convexSessionToken
      ? { logtoId, authToken: convexSessionToken }
      : "skip",
  );

  useEffect(() => {
    if (!isAuthenticated || authFailureReason) return;
    if (!logtoId || !accessToken || !convexSessionToken) return;
    if (convexUser !== undefined) return;

    const timeout = window.setTimeout(() => {
      markAuthFailure("user_query_timeout");
    }, 12_000);

    return () => window.clearTimeout(timeout);
  }, [
    isAuthenticated,
    authFailureReason,
    logtoId,
    accessToken,
    convexSessionToken,
    convexUser,
    markAuthFailure,
  ]);

  useEffect(() => {
    if (authFailureReason) {
      setIsProvisioningUser(false);
      return;
    }

    if (!shouldAttemptProvisioning({
      isAuthenticated: !!isAuthenticated,
      logtoId,
      convexSessionToken,
      convexUser,
      lastProvisioningAttemptLogtoId: lastProvisioningAttemptRef.current,
    })) {
      setIsProvisioningUser(false);
      return;
    }

    lastProvisioningAttemptRef.current = logtoId!;
    setIsProvisioningUser(true);

    let cancelled = false;
    const attemptProvision = async () => {
      try {
        const claims = await getIdTokenClaimsRef.current?.();
        const token = accessToken ?? (await getAccessTokenRef.current?.());
        if (!claims?.sub || !token || !convexSessionToken) {
          throw new Error("Missing claims, access token, or session token during user provisioning");
        }

        await upsertUser({
          logtoId: claims.sub,
          authToken: convexSessionToken,
          email: (claims as any).email || "",
          name: (claims as any).name || claims.sub,
          avatar: (claims as any).picture,
          signInMethod: "logto",
        });
      } catch (err) {
        console.error("Failed to provision user from auth state:", err);
      } finally {
        if (!cancelled) {
          setIsProvisioningUser(false);
        }
      }
    };

    void attemptProvision();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    logtoId,
    convexSessionToken,
    convexUser,
    accessToken,
    upsertUser,
    authFailureReason,
  ]);

  const userRole: UserRole = (convexUser?.role as UserRole) ?? "Member";
  const hasProvisioningAttempt =
    !!logtoId && lastProvisioningAttemptRef.current === logtoId;
  const { isAuthResolved, isLoading } = resolveAuthState({
    logtoLoading,
    isAuthenticated: !!isAuthenticated,
    logtoId,
    accessToken,
    convexSessionToken,
    convexUser,
    isProvisioningUser,
    hasProvisioningAttempt,
    authFailureReason,
  });

  useEffect(() => {
    if (!authFailureReason || signOutTriggeredRef.current) return;
    signOutTriggeredRef.current = true;
    performSignOut("session-init");
  }, [authFailureReason, performSignOut]);

  return useMemo(() => ({
    isAuthenticated: isAuthenticated ?? false,
    isLoading,
    isAuthResolved,
    isProvisioningUser,
    authFailureReason,
    user: convexUser ?? null,
    userRole,
    logtoId,
    accessToken,
    convexSessionToken,
    getAuthHeaders,
    signIn: () =>
      signIn(
        import.meta.env.VITE_LOGTO_REDIRECT_URI || `${origin}/callback`,
      ),
    signOut: () => performSignOut(),
  }), [
    accessToken,
    authFailureReason,
    convexSessionToken,
    getAuthHeaders,
    isAuthResolved,
    isAuthenticated,
    isLoading,
    isProvisioningUser,
    logtoId,
    origin,
    performSignOut,
    signIn,
    userRole,
    convexUser,
  ]);
}
