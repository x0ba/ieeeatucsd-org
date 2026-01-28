import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "../lib/auth-client";

export function useCurrentUser() {
  try {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
      return null;
    }

    // Check if Convex context is available before using useQuery
    const convex = useConvex();
    if (!convex) {
      console.warn("Convex context not available in useCurrentUser");
      return null;
    }
    
    return useQuery(api.users.getCurrentUser, {});
  } catch (error) {
    console.warn("Convex context not available in useCurrentUser:", error);
    return null;
  }
}

export function useUserByAuthUserId(authUserId: string) {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return useQuery(api.users.getUserByAuthUserId, { authUserId });
  } catch (error) {
    console.warn("Convex context not available in useUserByAuthUserId:", error);
    return undefined;
  }
}

export function useUpdateNavigationLayout() {
  return useMutation(api.users.updateNavigationLayout);
}

export function useHasOfficerRole(authUserId: string) {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    return useQuery(api.users.hasOfficerRole, { authUserId });
  } catch (error) {
    console.warn("Convex context not available in useHasOfficerRole:", error);
    return undefined;
  }
}

export function useSyncUserFromSession() {
  return useMutation(api.users.syncUserFromSession);
}

// Storage hooks
export function useUploadFile() {
  return useAction(api.storage.uploadFile);
}

export function useUploadMultipleFiles() {
  return useAction(api.storage.uploadMultipleFiles);
}

export function useGetFileUrl(storageId: Id<"_storage">) {
  return useQuery(api.storage.getFileUrl, { storageId });
}

export function useDeleteFile() {
  return useMutation(api.storage.deleteFile);
}

// Overview hooks
export function useOverviewData(authUserId: string) {
  return useQuery(api.overview.getOverviewData, { authUserId });
}

// Events hooks
export function usePublishedEvents() {
  return useQuery(api.events.getPublishedEvents, {});
}

export function useUserAttendedEvents(authUserId: string) {
  return useQuery(api.events.getUserAttendedEvents, { authUserId });
}

export function useEventRequests() {
  return useQuery(api.events.getEventRequests, {});
}

export function useUserEventRequests(authUserId: string) {
  return useQuery(api.events.getEventRequestsByUser, { authUserId });
}

export function useUsers() {
  return useQuery(api.events.getUsers, {});
}

// Links hooks
export function useLinks() {
  return useQuery(api.dashboard.getLinks, {});
}

export function useLinksByCategory(category: string) {
  return useQuery(api.dashboard.getLinksByCategory, { category });
}

// Fund deposits hooks
export function useUserFundDeposits(authUserId: string) {
  return useQuery(api.fundDeposits.getUserFundDeposits, { depositedBy: authUserId });
}

export function useAllFundDeposits() {
  return useQuery(api.fundDeposits.getAllFundDeposits, {});
}

// Notifications hooks
export function useUserNotifications(authUserId: string) {
  return useQuery(api.dashboard.getUserNotifications, { authUserId });
}

export function useUnreadNotifications(authUserId: string) {
  return useQuery(api.dashboard.getUnreadNotifications, { authUserId });
}

// Public profiles hooks
export function usePublicProfiles() {
  return useQuery(api.dashboard.getPublicProfiles, {});
}

// Constitutions hooks
export function useConstitutions() {
  return useQuery(api.dashboard.getConstitutions, {});
}

export function useConstitutionsByStatus(status: "draft" | "published" | "archived") {
  return useQuery(api.dashboard.getConstitutionsByStatus, { status });
}

// Fund requests hooks
export function useUserFundRequests(authUserId: string) {
  return useQuery(api.fundRequests.getUserFundRequests, { submittedBy: authUserId });
}

export function useAllFundRequests() {
  return useQuery(api.fundRequests.getAllFundRequests, {});
}

export function useFundRequestById(id: string) {
  return useQuery(api.fundRequests.getFundRequestById, { id: id as any });
}

export function useBudgetConfig(department: "events" | "projects" | "internal" | "other") {
  return useQuery(api.fundRequests.getBudgetConfig, { department });
}

export function useBudgetAdjustments(department: "events" | "projects" | "internal" | "other") {
  return useQuery(api.fundRequests.getBudgetAdjustments, { department });
}

// Combined auth hook for components that need both authUserId and user data
export function useAuth() {
  // Check if we're in a browser environment first
  if (typeof window === 'undefined') {
    return {
      authUserId: null,
      user: null,
      authUser: null,
      role: null,
      signOut: async () => {},
    };
  }

  try {
    const user = useCurrentUser();
    const authUserId = user?._id;
    
    const signOut = async () => {
      await authClient.signOut();
    };
    
    return {
      authUserId,
      user,
      authUser: user, // Add authUser alias for compatibility
      role: user?.role, // Add role property
      signOut
    };
  } catch (error) {
    console.warn("Auth context not available:", error);
    return {
      authUserId: null,
      user: null,
      authUser: null,
      role: null,
      signOut: async () => {},
    };
  }
}

// Main useConvexAuth hook that components are expecting
export function useConvexAuth() {
  const user = useCurrentUser();
  
  return {
    user,
    isLoading: user === undefined || user === null,
    isAuthenticated: !!user,
    authUserId: user?._id
  };
}
