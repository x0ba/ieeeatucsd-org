import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface SyncStatusContextType {
  isSyncing: boolean;
  syncCount: number;
  registerSync: (id: string) => void;
  unregisterSync: (id: string) => void;
}

const SyncStatusContext = createContext<SyncStatusContextType | undefined>(
  undefined,
);

export function SyncStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeSyncs, setActiveSyncs] = useState<Set<string>>(new Set());

  const registerSync = useCallback((id: string) => {
    setActiveSyncs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unregisterSync = useCallback((id: string) => {
    setActiveSyncs((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setActiveSyncs(new Set());
    };
  }, []);

  const value = useMemo<SyncStatusContextType>(
    () => ({
      isSyncing: activeSyncs.size > 0,
      syncCount: activeSyncs.size,
      registerSync,
      unregisterSync,
    }),
    [activeSyncs, registerSync, unregisterSync],
  );

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextType {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error("useSyncStatus must be used within a SyncStatusProvider");
  }
  return context;
}
