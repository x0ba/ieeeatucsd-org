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
  return useQuery(api.dashboard.getUserNotifications, { userId: authUserId });
}

export function useUnreadNotifications(authUserId: string) {
  return useQuery(api.dashboard.getUnreadNotifications, { userId: authUserId });
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
  return useQuery(api.fundRequests.getFundRequestById, { id });
}

export function useBudgetConfig(department: "events" | "projects" | "internal" | "other") {
  return useQuery(api.fundRequests.getBudgetConfig, { department });
}

export function useBudgetAdjustments(department: "events" | "projects" | "internal" | "other") {
  return useQuery(api.fundRequests.getBudgetAdjustments, { department });
}
