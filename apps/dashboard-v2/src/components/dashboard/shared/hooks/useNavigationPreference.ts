import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import { useAuth } from "../../../../hooks/useConvexAuth";
import { safeLocalStorageGet, safeLocalStorageSet } from "../utils/storage";

const STORAGE_KEY = "ieee_navigation_layout";
const DEFAULT_LAYOUT = "sidebar";

type NavigationLayout = "horizontal" | "sidebar";

interface UseNavigationPreferenceResult {
  navigationLayout: NavigationLayout;
  setNavigationLayout: (layout: NavigationLayout) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage user's navigation layout preference with client-side caching
 * and Convex persistence.
 *
 * Features:
 * - Loads preference from localStorage immediately (prevents layout flash)
 * - Syncs with Convex in real-time
 * - Updates both localStorage and Convex when preference changes
 * - Falls back to default if no preference is set
 */
export function useNavigationPreference(): UseNavigationPreferenceResult {
  const { user } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const updateNavigationLayout = useMutation(api.users.updateNavigationLayout);

  const [navigationLayout, setNavigationLayoutState] =
    useState<NavigationLayout>(() => {
      const cached = safeLocalStorageGet(STORAGE_KEY);
      if (cached === "horizontal" || cached === "sidebar") {
        return cached;
      }
      return DEFAULT_LAYOUT;
    });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with Convex using reactive query
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (currentUser !== undefined) {
      const convexLayout = currentUser?.navigationLayout as NavigationLayout | undefined;

      if (
        convexLayout &&
        (convexLayout === "horizontal" || convexLayout === "sidebar")
      ) {
        // Update state and cache if Convex has a valid preference
        setNavigationLayoutState(convexLayout);
        safeLocalStorageSet(STORAGE_KEY, convexLayout);
      } else {
        // If no preference in Convex, use cached or default
        const cached = safeLocalStorageGet(STORAGE_KEY);
        if (cached === "horizontal" || cached === "sidebar") {
          setNavigationLayoutState(cached);
        } else {
          setNavigationLayoutState(DEFAULT_LAYOUT);
          safeLocalStorageSet(STORAGE_KEY, DEFAULT_LAYOUT);
        }
      }
      setLoading(false);
    }
  }, [user, currentUser]);

  // Update preference
  const setNavigationLayout = useCallback(
    async (layout: NavigationLayout) => {
      if (!user) {
        throw new Error(
          "User must be authenticated to update navigation preference",
        );
      }

      try {
        // Update localStorage immediately for instant feedback
        if (!safeLocalStorageSet(STORAGE_KEY, layout)) {
          console.warn(
            "Failed to persist navigation layout preference to localStorage.",
          );
        }
        setNavigationLayoutState(layout);

        // Update Convex
        await updateNavigationLayout({
          authUserId: user.authUserId,
          navigationLayout: layout,
        });
      } catch (err) {
        console.error("Error updating navigation preference:", err);
        setError(
          err instanceof Error ? err.message : "Failed to update preference",
        );
        throw err;
      }
    },
    [user, updateNavigationLayout],
  );

  return {
    navigationLayout,
    setNavigationLayout,
    loading,
    error,
  };
}
