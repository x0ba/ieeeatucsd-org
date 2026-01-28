import React, {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
} from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { useQuery, useMutation } from "convex/react";
// @ts-ignore - Types will be generated after convex dev runs
import { api } from "#convex/_generated/api";
import { authClient } from "../../lib/auth-client";

// Create Convex React Client
const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL || "http://localhost:3210",
);

const UserContext = createContext<{
  convexUser: any;
  syncStatus: "loading" | "synced" | "error" | "already_synced";
}>({
  convexUser: null,
  syncStatus: "loading",
});

function UserSyncInternal({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // @ts-ignore - Types will be generated after convex dev runs
  const convexUser = useQuery(
    api.users.getUserByAuthUserId,
    session?.user?.id ? { authUserId: session.user.id } : "skip",
  );

  // @ts-ignore - Types will be generated after convex dev runs
  const syncUser = useMutation(api.users.syncUser);

  const syncStatus: "loading" | "synced" | "error" | "already_synced" = (() => {
    if (sessionLoading) return "loading";
    if (!session?.user?.id) return "loading";
    if (convexUser) return "already_synced";
    if (convexUser === null && sessionLoading === false) return "error";
    return "loading";
  })();

  // Sync user to Convex when session is available and Convex user doesn't exist
  useEffect(() => {
    async function sync() {
      if (session?.user && !convexUser && sessionLoading === false) {
        try {
          await syncUser({
            authUserId: session.user.id,
            email: session.user.email,
            name: session.user.name,
            avatar: session.user.image || undefined,
          });
        } catch (error) {
          console.error("Failed to sync user to Convex:", error);
        }
      }
    }
    sync();
  }, [session, convexUser, sessionLoading, syncUser]);

  return (
    <UserContext.Provider value={{ convexUser, syncStatus }}>
      {children}
    </UserContext.Provider>
  );
}

function UserSyncWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <UserContext.Provider
        value={{ convexUser: null, syncStatus: "loading" }}
      >
        {children}
      </UserContext.Provider>
    );
  }

  return <UserSyncInternal>{children}</UserSyncInternal>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <UserSyncWrapper>{children}</UserSyncWrapper>
    </ConvexProvider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
