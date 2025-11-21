import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserRole } from "../components/dashboard/shared/types/firestore";
import type { User } from "firebase/auth";
import { useAsyncOperation } from "../components/dashboard/shared/hooks/useAsyncOperation";
import { useLoadingOperation } from "../components/dashboard/shared/contexts/LoadingContext";

interface UseAuthResult {
  user: User | null;
  userRole: UserRole;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [authedUser] = useAuthState(auth);
  const [userRole, setUserRole] = useState<UserRole>("Member");
  const [error, setError] = useState<string | null>(null);
  
  // Use our enhanced async operation hooks
  const roleFetchOperation = useAsyncOperation<{ role: UserRole }>();
  const { start: startRoleLoading, stop: stopRoleLoading } = useLoadingOperation('auth-role-fetch');

  useEffect(() => {
    if (!authedUser) {
      setUserRole("Member");
      setError(null);
      stopRoleLoading();
      return;
    }

    startRoleLoading("Fetching user permissions...", 10000); // 10 second timeout

    // Set up real-time listener for user role
    const unsubscribe = onSnapshot(
      doc(db, "users", authedUser.uid),
      (userDocSnap) => {
        if (userDocSnap.exists()) {
          const role = (userDocSnap.data().role || "Member") as UserRole;
          setUserRole(role);
          setError(null);
        } else {
          setUserRole("Member");
        }
        stopRoleLoading();
      },
      (e: any) => {
        const errorMessage = e?.message || "Failed to fetch user role";
        setError(errorMessage);
        stopRoleLoading(errorMessage);
      },
    );

    return () => {
      stopRoleLoading();
      unsubscribe();
    };
  }, [authedUser, startRoleLoading, stopRoleLoading]);

  // Combine loading states
  const loading = roleFetchOperation.state.isLoading || roleFetchOperation.state.isLoading;

  return { user: authedUser ?? null, userRole, loading, error };
}
