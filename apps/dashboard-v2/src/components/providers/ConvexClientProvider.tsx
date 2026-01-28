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
import { ConvexErrorBoundary } from "../shared/ConvexErrorBoundary";

// Create Convex React Client
let convex: ConvexReactClient | null = null;
let convexInitError: Error | null = null;

const initializeConvex = () => {
  if (convex || convexInitError) return;

  try {
    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL || "http://localhost:3210";
    console.log("Initializing Convex client with URL:", convexUrl);
    
    convex = new ConvexReactClient(convexUrl);
    console.log("Convex client initialized successfully");
  } catch (error) {
    convexInitError = error as Error;
    console.error("Failed to initialize Convex client:", error);
  }
};

// Try to initialize immediately
initializeConvex();

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
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </UserContext.Provider>
    );
  }

  return <UserSyncInternal>{children}</UserSyncInternal>;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Try to initialize if not already done
  if (!convex && !convexInitError) {
    initializeConvex();
  }

  if (!convex) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {convexInitError ? "Failed to connect to Convex" : "Connecting to Convex..."}
            </p>
            {convexInitError && (
              <p className="text-sm text-red-600 mt-2">
                Please make sure the Convex dev server is running
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConvexErrorBoundary>
      <ConvexProvider client={convex}>
        <UserSyncWrapper>{children}</UserSyncWrapper>
      </ConvexProvider>
    </ConvexErrorBoundary>
  );
}

export function useUser() {
  return useContext(UserContext);
}
