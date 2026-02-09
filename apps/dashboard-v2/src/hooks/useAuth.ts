import { useLogto } from "@logto/react";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";

export type UserRole =
  | "Member"
  | "General Officer"
  | "Executive Officer"
  | "Member at Large"
  | "Past Officer"
  | "Sponsor"
  | "Administrator";

const isServer = typeof window === "undefined";

// SSR-safe no-op defaults — useLogto() cannot be called during SSR
// because LogtoProvider is guarded behind a client-only check.
const ssrDefaults = {
  isAuthenticated: false as const,
  isLoading: true as const,
  user: null,
  userRole: "Member" as UserRole,
  logtoId: null as string | null,
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
  } = useLogto();

  const [logtoId, setLogtoId] = useState<string | null>(null);

  // Fetch logtoId from ID token claims when authenticated
  useEffect(() => {
    if (isAuthenticated && !logtoId) {
      getIdTokenClaims?.().then((claims) => {
        if (claims?.sub) {
          setLogtoId(claims.sub);
        }
      }).catch((err) => {
        console.error("Failed to get ID token claims:", err);
      });
    }
    if (!isAuthenticated) {
      setLogtoId(null);
    }
  }, [isAuthenticated, logtoId, getIdTokenClaims]);

  // convexUser is:
  //   undefined — query still loading (Convex hasn't responded yet)
  //   null      — authenticated but user not found in DB (first sign-in, before callback upsert)
  //   object    — user found in DB
  const convexUser = useQuery(
    api.users.getMe,
    isAuthenticated && logtoId ? { logtoId } : "skip",
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
      (isAuthenticated && logtoId !== null && convexUser === undefined);

  const origin = window.location.origin;

  return {
    isAuthenticated: isAuthenticated ?? false,
    isLoading,
    user: convexUser ?? null,
    userRole,
    logtoId,
    signIn: () =>
      signIn(
        import.meta.env.VITE_LOGTO_REDIRECT_URI || `${origin}/callback`,
      ),
    signOut: () =>
      signOut(`${origin}/signin`),
  };
}
