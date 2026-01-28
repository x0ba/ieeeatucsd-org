import { createAuthClient } from "better-auth/react";

const siteURL = import.meta.env.VITE_CONVEX_SITE_URL || "";
export const authClient = createAuthClient({
  baseURL: siteURL ? `${siteURL}/api/auth` : "/api/auth",
});

/**
 * Custom hook for Better Auth integration with Convex
 * Provides user session and sign out functionality
 */
export function useAuth() {
  const { data: session, isPending } = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    user: session?.user || null,
    isLoading: isPending,
    signOut,
  };
}
