import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function useCurrentUser() {
  return useQuery(api.users.getCurrentUser, {});
}

export function useUserByAuthUserId(authUserId: string) {
  return useQuery(api.users.getUserByAuthUserId, { authUserId });
}

export function useUpdateNavigationLayout() {
  return useMutation(api.users.updateNavigationLayout);
}

export function useHasOfficerRole(authUserId: string) {
  return useQuery(api.users.hasOfficerRole, { authUserId });
}

export function useSyncUserFromSession() {
  return useMutation(api.users.syncUserFromSession);
}

// Storage hooks - not implemented yet
// export function useUploadFile() {
//   return useMutation(api.storage.uploadFile);
// }

// export function useUploadMultipleFiles() {
//   return useMutation(api.storage.uploadMultipleFiles);
// }

// export function useGetFileUrl(storageId: Id<"_storage">) {
//   return useQuery(api.storage.getFileUrl, { storageId });
// }

// export function useDeleteFile() {
//   return useMutation(api.storage.deleteFile);
// }

// Overview hooks - not implemented yet
// export function useOverviewData(authUserId: string) {
//   return useQuery(api.overview.getOverviewData, { authUserId });
// }

// Events hooks - TODO: Regenerate Convex API to include events module
export function usePublishedEvents() {
  // TODO: Replace with actual API call when Convex API is regenerated
  return [];
}

export function useUserAttendedEvents(authUserId: string) {
  // TODO: Replace with actual API call when Convex API is regenerated
  return [];
}

// export function useEventRequests() {
//   return useQuery(api.events.getEventRequests, {});
// }

// export function useUserEventRequests(authUserId: string) {
//   return useQuery(api.events.getEventRequestsByUser, { authUserId });
// }

// export function useUsers() {
//   return useQuery(api.events.getUsers, {});
// }

// Links hooks - TODO: Regenerate Convex API to include dashboard module
// export function useLinks() {
//   return useQuery(api.dashboard.getLinks, {});
// }

// export function useLinksByCategory(category: string) {
//   return useQuery(api.dashboard.getLinksByCategory, { category });
// }

// Fund deposits hooks - TODO: Regenerate Convex API to include fundDeposits module
// export function useUserFundDeposits(authUserId: string) {
//   return useQuery(api.fundDeposits.getUserFundDeposits, { depositedBy: authUserId });
// }

// export function useAllFundDeposits() {
//   return useQuery(api.fundDeposits.getAllFundDeposits, {});
// }

// Notifications hooks - TODO: Regenerate Convex API to include dashboard module
// export function useUserNotifications(authUserId: string) {
//   return useQuery(api.dashboard.getUserNotifications, { userId: authUserId });
// }

// export function useUnreadNotifications(authUserId: string) {
//   return useQuery(api.dashboard.getUnreadNotifications, { userId: authUserId });
// }

// Public profiles hooks - TODO: Regenerate Convex API to include dashboard module
// export function usePublicProfiles() {
//   return useQuery(api.dashboard.getPublicProfiles, {});
// }

// Constitutions hooks - TODO: Regenerate Convex API to include dashboard module
// export function useConstitutions() {
//   return useQuery(api.dashboard.getConstitutions, {});
// }

// export function useConstitutionsByStatus(status: "draft" | "published" | "archived") {
//   return useQuery(api.dashboard.getConstitutionsByStatus, { status });
// }

// Fund requests hooks - TODO: Regenerate Convex API to include fundRequests module
export function useUserFundRequests(authUserId: string) {
  // TODO: Replace with actual API call when Convex API is regenerated
  return [];
}

export function useAllFundRequests() {
  // TODO: Replace with actual API call when Convex API is regenerated
  return [];
}

export function useFundRequestById(id: string) {
  // TODO: Replace with actual API call when Convex API is regenerated
  return null;
}

export function useBudgetConfig(department: "events" | "projects" | "internal" | "other") {
  // TODO: Replace with actual API call when Convex API is regenerated
  return null;
}

// export function useBudgetAdjustments(department: "events" | "projects" | "internal" | "other") {
//   return useQuery(api.fundRequests.getBudgetAdjustments, { department });
// }

// Combined auth hook for components that need both authUserId and user data
export function useAuth() {
  const user = useCurrentUser();
  const authUserId = user?._id;
  
  return {
    authUserId,
    user
  };
}
