import { useLogto } from "@logto/react";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { UserRole } from "@/types/roles";

export type { UserRole };

const isServer = typeof window === "undefined";

// SSR-safe no-op defaults — useLogto() cannot be called during SSR
// because LogtoProvider is guarded behind a client-only check.
const ssrDefaults = {
  isAuthenticated: false as const,
  isLoading: true as const,
  user: null,
  userRole: "Member" as UserRole,
  logtoId: null as string | null,
  accessToken: null as string | null,
  convexSessionToken: null as string | null,
  getAuthHeaders: (): Record<string, string> => ({}),
  signIn: () => {},
  signOut: () => {},
};

export function useAuth() {
  // During SSR, LogtoProvider is not mounted so useLogto() would throw.
  // Return loading defaults — the client will hydrate with real state.
  if (isServer) {
    return ssrDefaults;
  }

  return useAuthClient();
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

  const [logtoId, setLogtoId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [convexSessionToken, setConvexSessionToken] = useState<string | null>(null);
  const [convexSessionExpiresAt, setConvexSessionExpiresAt] = useState<number | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!accessToken) return {};
    return { Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  const mintConvexSession = useCallback(
    async (token: string) => {
      const response = await fetch("/api/auth/convex-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to mint Convex session (${response.status})`);
      }

      const data = (await response.json()) as {
        sessionToken: string;
        expiresAt: number;
      };
      setConvexSessionToken(data.sessionToken);
      setConvexSessionExpiresAt(data.expiresAt);
    },
    [],
  );

  // Fetch logtoId from ID token claims when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLogtoId(null);
      setAccessToken(null);
      setConvexSessionToken(null);
      setConvexSessionExpiresAt(null);
      return;
    }

    let cancelled = false;
    const loadAuth = async () => {
      try {
        const [claims, token] = await Promise.all([
          getIdTokenClaims?.(),
          getAccessToken?.(),
        ]);

        if (cancelled) return;
        if (claims?.sub) setLogtoId(claims.sub);
        if (token) {
          setAccessToken(token);
          const refreshSoon = !convexSessionExpiresAt || Date.now() + 60_000 >= convexSessionExpiresAt;
          if (!convexSessionToken || refreshSoon) {
            await mintConvexSession(token);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to initialize auth:", err);
        }
      }
    };

    void loadAuth();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    getIdTokenClaims,
    getAccessToken,
    convexSessionExpiresAt,
    convexSessionToken,
    mintConvexSession,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const timer = window.setInterval(() => {
      const shouldRefresh = !convexSessionExpiresAt || Date.now() + 60_000 >= convexSessionExpiresAt;
      if (shouldRefresh) {
        void mintConvexSession(accessToken).catch((err) => {
          console.error("Failed to refresh Convex session:", err);
        });
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, accessToken, convexSessionExpiresAt, mintConvexSession]);

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

  const userRole: UserRole = (convexUser?.role as UserRole) ?? "Member";
  // Consider loading if we don't yet have enough info to render.
  // If we already have isAuthenticated + logtoId + convexUser, we're done
  // regardless of logtoLoading (Logto SDK sometimes stays loading after auth completes).
  const hasFullAuth = isAuthenticated && logtoId !== null && convexUser != null;
  const isLoading = hasFullAuth
    ? false
    : logtoLoading ||
      (isAuthenticated && !logtoId) ||
      (isAuthenticated && !accessToken) ||
      (isAuthenticated && !convexSessionToken) ||
      (isAuthenticated && logtoId !== null && convexUser === undefined);

  const origin = window.location.origin;

  return {
    isAuthenticated: isAuthenticated ?? false,
    isLoading,
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
    signOut: () => {
      setAccessToken(null);
      setConvexSessionToken(null);
      setConvexSessionExpiresAt(null);
      signOut(`${origin}/signin`);
    },
  };
}
