import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../../firebase/client";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "../utils/storage";
import type { NavigationLayout } from "../types/firestore";

const STORAGE_KEY = "ieee_navigation_layout";
const DEFAULT_LAYOUT: NavigationLayout = "sidebar";
const NAV_PREF_TIMEOUT_MS = 4000;

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

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (!hasResolved && isActive) {
        console.warn(
          "Timed out waiting for navigation preference; falling back to cached/default layout.",
        );
        setLoading(false);
        hasResolved = true;
      }
    }, NAV_PREF_TIMEOUT_MS);

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!isActive) {
          return;
        }

        hasResolved = true;
        clearTimeout(timeoutId);

        if (snapshot.exists()) {
          const data = snapshot.data();
          const firestoreLayout = data.navigationLayout as
            | NavigationLayout
            | undefined;

          if (
            firestoreLayout &&
            (firestoreLayout === "horizontal" || firestoreLayout === "sidebar")
          ) {
            // Update state and cache if Firestore has a valid preference
            setNavigationLayoutState(firestoreLayout);
            if (!safeLocalStorageSet(STORAGE_KEY, firestoreLayout)) {
              console.warn(
                "Failed to persist navigation layout preference to localStorage.",
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
                  "Failed to persist default navigation layout to localStorage.",
                );
              }
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
        console.error("Error loading navigation preference:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      unsubscribe();
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
