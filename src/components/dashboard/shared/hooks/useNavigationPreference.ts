import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../../firebase/client";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  clearFirestoreCache,
} from "../utils/storage";
import { showToast } from "../utils/toast";
import type { NavigationLayout } from "../types/firestore";

const STORAGE_KEY = "ieee_navigation_layout";
const DEFAULT_LAYOUT: NavigationLayout = "sidebar";
// Reduced timeout from 4000ms to 2000ms for better UX
// This prevents infinite loading when Firestore cache is stale or corrupted
const NAV_PREF_TIMEOUT_MS = 2000;
// Track timeout occurrences to detect persistent cache issues
const TIMEOUT_TRACKER_KEY = "ieee_nav_pref_timeout_count";
const MAX_TIMEOUTS_BEFORE_CACHE_CLEAR = 3;

interface UseNavigationPreferenceResult {
  navigationLayout: NavigationLayout;
  setNavigationLayout: (layout: NavigationLayout) => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to manage user's navigation layout preference with client-side caching
 * and Firestore persistence.
 *
 * Features:
 * - Loads preference from localStorage immediately (prevents layout flash)
 * - Syncs with Firestore in real-time
 * - Updates both localStorage and Firestore when preference changes
 * - Falls back to default if no preference is set
 */
export function useNavigationPreference(): UseNavigationPreferenceResult {
  const [user] = useAuthState(auth);
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

  // Sync with Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let isActive = true;
    let hasResolved = false;

    // Timeout to prevent infinite loading - this is critical for handling
    // cases where Firestore cache is corrupted or onSnapshot never fires
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(async () => {
      if (!hasResolved && isActive) {
        console.warn(
          "[useNavigationPreference] Timed out waiting for navigation preference; falling back to cached/default layout.",
        );

        // Track timeout occurrences to detect persistent cache issues
        const timeoutCountStr = safeLocalStorageGet(TIMEOUT_TRACKER_KEY);
        const timeoutCount = timeoutCountStr
          ? parseInt(timeoutCountStr, 10)
          : 0;
        const newTimeoutCount = timeoutCount + 1;

        if (newTimeoutCount >= MAX_TIMEOUTS_BEFORE_CACHE_CLEAR) {
          console.warn(
            `[useNavigationPreference] Detected ${newTimeoutCount} consecutive timeouts. Clearing Firestore cache to resolve potential corruption.`,
          );
          // Clear the cache asynchronously
          clearFirestoreCache()
            .then((success) => {
              if (success) {
                console.log(
                  "[useNavigationPreference] Cache cleared successfully. Please refresh the page.",
                );
                // Reset the timeout counter
                safeLocalStorageSet(TIMEOUT_TRACKER_KEY, "0");
                // Notify user
                showToast.warning(
                  "Cache Cleared",
                  "We've cleared your local cache to fix loading issues. Please refresh the page.",
                  8000,
                );
              }
            })
            .catch((err) => {
              console.error(
                "[useNavigationPreference] Failed to clear cache:",
                err,
              );
            });
        } else {
          // Increment timeout counter
          safeLocalStorageSet(TIMEOUT_TRACKER_KEY, newTimeoutCount.toString());
        }

        setLoading(false);
        hasResolved = true;
      }
    }, NAV_PREF_TIMEOUT_MS);

    const userRef = doc(db, "users", user.uid);

    // Set up the Firestore listener with error handling
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onSnapshot(
        userRef,
        {
          // Include metadata changes to detect cache vs server data
          includeMetadataChanges: false,
        },
        (snapshot) => {
          if (!isActive) {
            return;
          }

          hasResolved = true;
          clearTimeout(timeoutId);

          // Reset timeout counter on successful load
          safeLocalStorageSet(TIMEOUT_TRACKER_KEY, "0");

          if (snapshot.exists()) {
            const data = snapshot.data();
            const firestoreLayout = data.navigationLayout as
              | NavigationLayout
              | undefined;

            if (
              firestoreLayout &&
              (firestoreLayout === "horizontal" ||
                firestoreLayout === "sidebar")
            ) {
              // Update state and cache if Firestore has a valid preference
              setNavigationLayoutState(firestoreLayout);
              if (!safeLocalStorageSet(STORAGE_KEY, firestoreLayout)) {
                console.warn(
                  "[useNavigationPreference] Failed to persist navigation layout preference to localStorage.",
                );
              }
            } else {
              // If no preference in Firestore, use cached or default
              const cached = safeLocalStorageGet(STORAGE_KEY);
              if (cached === "horizontal" || cached === "sidebar") {
                setNavigationLayoutState(cached);
              } else {
                setNavigationLayoutState(DEFAULT_LAYOUT);
                if (!safeLocalStorageSet(STORAGE_KEY, DEFAULT_LAYOUT)) {
                  console.warn(
                    "[useNavigationPreference] Failed to persist default navigation layout to localStorage.",
                  );
                }
              }
            }
          } else {
            // Document doesn't exist - use cached or default
            const cached = safeLocalStorageGet(STORAGE_KEY);
            if (cached === "horizontal" || cached === "sidebar") {
              setNavigationLayoutState(cached);
            } else {
              setNavigationLayoutState(DEFAULT_LAYOUT);
              if (!safeLocalStorageSet(STORAGE_KEY, DEFAULT_LAYOUT)) {
                console.warn(
                  "[useNavigationPreference] Failed to persist default navigation layout to localStorage.",
                );
              }
            }
          }
          setLoading(false);
        },
        (err) => {
          if (!isActive) {
            return;
          }

          hasResolved = true;
          clearTimeout(timeoutId);
          console.error(
            "[useNavigationPreference] Error loading navigation preference:",
            err,
          );
          setError(err.message);
          // Even on error, stop loading and use cached/default value
          setLoading(false);
        },
      );
    } catch (err) {
      // Handle synchronous errors from onSnapshot setup
      console.error(
        "[useNavigationPreference] Failed to set up Firestore listener:",
        err,
      );
      hasResolved = true;
      clearTimeout(timeoutId);
      setLoading(false);
    }

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error(
            "[useNavigationPreference] Error unsubscribing from Firestore:",
            err,
          );
        }
      }
    };
  }, [user]);

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

        // Update Firestore
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
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
    [user],
  );

  return {
    navigationLayout,
    setNavigationLayout,
    loading,
    error,
  };
}
