import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../../firebase/client";
import {
  getValidatedCache,
  setValidatedCache,
  clearFirestoreCache,
} from "../utils/storage";
import { showToast } from "../utils/toast";
import type { NavigationLayout } from "../types/firestore";

const STORAGE_KEY = "ieee_navigation_layout";
const DEFAULT_LAYOUT: NavigationLayout = "sidebar";
// Timeout for Firebase operations - aggressive to ensure cache-first experience
const NAV_PREF_TIMEOUT_MS = 1500;
// Track timeout occurrences to detect persistent cache issues
const TIMEOUT_TRACKER_KEY = "ieee_nav_pref_timeout_count";
const MAX_TIMEOUTS_BEFORE_CACHE_CLEAR = 3;

interface UseNavigationPreferenceResult {
  navigationLayout: NavigationLayout;
  setNavigationLayout: (layout: NavigationLayout) => Promise<void>;
  loading: boolean;
  error: string | null;
  isReady: boolean; // Indicates layout is ready to use
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
      // Cache-first: try validated cache first
      const cached = getValidatedCache<NavigationLayout>(STORAGE_KEY);
      if (cached === "horizontal" || cached === "sidebar") {
        return cached;
      }
      return DEFAULT_LAYOUT;
    });
  const [loading, setLoading] = useState(false); // Start as false - cache is immediate
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(true); // Ready immediately with cache

  // Use refs to persist state across re-renders and prevent timeout resets
  const hasResolvedRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);

  // Sync with Firestore in background (cache-first approach)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Don't show loading state - cache is already loaded
    setError(null);
    isSyncingRef.current = true;
    
    // Reset the resolved flag for this user session
    hasResolvedRef.current = false;

    let isActive = true;

    // Clear any existing timeout before creating a new one
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    // Timeout for Firebase sync - won't affect UI since we have cache
    timeoutIdRef.current = setTimeout(async () => {
      if (!hasResolvedRef.current && isActive) {
        console.warn(
          "[useNavigationPreference] Firebase sync timed out; continuing with cached layout.",
        );

        // Track timeout occurrences to detect persistent Firebase issues
        const timeoutCountStr = getValidatedCache<string>(TIMEOUT_TRACKER_KEY);
        const timeoutCount = timeoutCountStr
          ? parseInt(timeoutCountStr, 10)
          : 0;
        const newTimeoutCount = timeoutCount + 1;

        if (newTimeoutCount >= MAX_TIMEOUTS_BEFORE_CACHE_CLEAR) {
          console.warn(
            `[useNavigationPreference] Detected ${newTimeoutCount} consecutive timeouts. Clearing Firestore cache.`,
          );
          // Clear the cache asynchronously
          clearFirestoreCache()
            .then((success) => {
              if (success) {
                console.log(
                  "[useNavigationPreference] Cache cleared successfully.",
                );
                // Reset the timeout counter
                setValidatedCache(TIMEOUT_TRACKER_KEY, "0");
                // Notify user
                showToast.warning(
                  "Cache Cleared",
                  "We've cleared your local cache to fix sync issues. Please refresh if needed.",
                  6000,
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
          setValidatedCache(TIMEOUT_TRACKER_KEY, newTimeoutCount.toString());
        }

        isSyncingRef.current = false;
        hasResolvedRef.current = true;
      }
    }, NAV_PREF_TIMEOUT_MS);

    const userRef = doc(db, "users", user.uid);

    // Set up the Firestore listener with error handling
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onSnapshot(
        userRef,
        {
          // Don't include metadata changes - only real data updates
          includeMetadataChanges: false,
        },
        (snapshot) => {
          if (!isActive) {
            return;
          }

          hasResolvedRef.current = true;
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }

          // Reset timeout counter on successful sync
          setValidatedCache(TIMEOUT_TRACKER_KEY, "0");

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
              const currentCache = getValidatedCache<NavigationLayout>(STORAGE_KEY);
              
              // Only update if different from cache to avoid unnecessary re-renders
              if (currentCache !== firestoreLayout) {
                console.log(
                  `[useNavigationPreference] Synced from Firebase: ${firestoreLayout}`,
                );
                setNavigationLayoutState(firestoreLayout);
                if (!setValidatedCache(STORAGE_KEY, firestoreLayout)) {
                  console.warn(
                    "[useNavigationPreference] Failed to persist navigation layout to cache.",
                  );
                }
              }
            }
          }
          
          isSyncingRef.current = false;
        },
        (err) => {
          if (!isActive) {
            return;
          }

          hasResolvedRef.current = true;
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }
          console.error(
            "[useNavigationPreference] Error syncing with Firebase:",
            err,
          );
          setError(err.message);
          isSyncingRef.current = false;
        },
      );
    } catch (err) {
      // Handle synchronous errors from onSnapshot setup
      console.error(
        "[useNavigationPreference] Failed to set up Firestore listener:",
        err,
      );
      hasResolvedRef.current = true;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      isSyncingRef.current = false;
    }

    return () => {
      isActive = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
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

  // Update preference - cache-first with Firebase background sync
  const setNavigationLayout = useCallback(
    async (layout: NavigationLayout) => {
      if (!user) {
        throw new Error(
          "User must be authenticated to update navigation preference",
        );
      }

      try {
        // Update cache immediately for instant feedback
        if (!setValidatedCache(STORAGE_KEY, layout)) {
          console.warn(
            "Failed to persist navigation layout preference to cache.",
          );
        }
        setNavigationLayoutState(layout);

        // Update Firebase in background (don't await)
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, {
          navigationLayout: layout,
        }).catch((err) => {
          console.error("Error syncing navigation preference to Firebase:", err);
          // Don't throw - cache update succeeded, which is what matters for UX
          setError(
            err instanceof Error ? err.message : "Failed to sync with Firebase",
          );
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
    isReady,
  };
}
