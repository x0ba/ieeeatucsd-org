import { useState, useEffect, useCallback } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../../firebase/client";
import type { NavigationLayout } from "../types/firestore";

const STORAGE_KEY = "ieee_navigation_layout";
const DEFAULT_LAYOUT: NavigationLayout = "sidebar";

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
      // Initialize from localStorage immediately to prevent flash
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached === "horizontal" || cached === "sidebar") {
          return cached;
        }
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

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
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
            localStorage.setItem(STORAGE_KEY, firestoreLayout);
          } else {
            // If no preference in Firestore, use cached or default
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached === "horizontal" || cached === "sidebar") {
              setNavigationLayoutState(cached);
            } else {
              setNavigationLayoutState(DEFAULT_LAYOUT);
              localStorage.setItem(STORAGE_KEY, DEFAULT_LAYOUT);
            }
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading navigation preference:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
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
        localStorage.setItem(STORAGE_KEY, layout);
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
