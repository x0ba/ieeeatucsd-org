import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? `${window.location.origin}/api/auth`
    : "http://localhost:4321/api/auth",
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
