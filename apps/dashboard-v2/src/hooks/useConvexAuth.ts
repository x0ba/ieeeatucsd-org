import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "../lib/auth-client";
import { useEffect, useState } from "react";

export function useCurrentUser() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.users.getCurrentUser, mounted ? {} : "skip");
}

export function useUserByAuthUserId(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.users.getUserByAuthUserId, mounted && authUserId ? { authUserId } : "skip");
}

export function useUpdateNavigationLayout() {
  return useMutation(api.users.updateNavigationLayout);
}

export function useHasOfficerRole(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.users.hasOfficerRole, mounted && authUserId ? { authUserId } : "skip");
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
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.storage.getFileUrl, mounted && storageId ? { storageId } : "skip");
}

export function useDeleteFile() {
  return useMutation(api.storage.deleteFile);
}

// Overview hooks
export function useOverviewData(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.overview.getOverviewData, mounted && authUserId ? { authUserId } : "skip");
}

// Events hooks
export function usePublishedEvents() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.events.getPublishedEvents, mounted ? {} : "skip");
}

export function useUserAttendedEvents(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.events.getUserAttendedEvents, mounted && authUserId ? { authUserId } : "skip");
}

export function useEventRequests() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.events.getEventRequests, mounted ? {} : "skip");
}

export function useUserEventRequests(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.events.getEventRequestsByUser, mounted && authUserId ? { authUserId } : "skip");
}

export function useUsers() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.events.getUsers, mounted ? {} : "skip");
}

// Links hooks
export function useLinks() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getLinks, mounted ? {} : "skip");
}

export function useLinksByCategory(category: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getLinksByCategory, mounted && category ? { category } : "skip");
}

// Fund deposits hooks
export function useUserFundDeposits(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundDeposits.getUserFundDeposits, mounted && authUserId ? { depositedBy: authUserId } : "skip");
}

export function useAllFundDeposits() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundDeposits.getAllFundDeposits, mounted ? {} : "skip");
}

// Notifications hooks
export function useUserNotifications(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getUserNotifications, mounted && authUserId ? { authUserId } : "skip");
}

export function useUnreadNotifications(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getUnreadNotifications, mounted && authUserId ? { authUserId } : "skip");
}

// Public profiles hooks
export function usePublicProfiles() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getPublicProfiles, mounted ? {} : "skip");
}

// Constitutions hooks
export function useConstitutions() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getConstitutions, mounted ? {} : "skip");
}

export function useConstitutionsByStatus(status: "draft" | "published" | "archived") {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.dashboard.getConstitutionsByStatus, mounted && status ? { status } : "skip");
}

// Fund requests hooks
export function useUserFundRequests(authUserId: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundRequests.getUserFundRequests, mounted && authUserId ? { submittedBy: authUserId } : "skip");
}

export function useAllFundRequests() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundRequests.getAllFundRequests, mounted ? {} : "skip");
}

export function useFundRequestById(id: string) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundRequests.getFundRequestById, mounted && id ? { id: id as any } : "skip");
}

export function useBudgetConfig(department: "events" | "projects" | "internal" | "other") {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundRequests.getBudgetConfig, mounted && department ? { department } : "skip");
}

export function useBudgetAdjustments(department: "events" | "projects" | "internal" | "other") {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use "skip" pattern to prevent execution during SSR/hydration
  return useQuery(api.fundRequests.getBudgetAdjustments, mounted && department ? { department } : "skip");
}

// Combined auth hook for components that need both authUserId and user data
export function useAuth() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const user = useCurrentUser();

  const authUserId = user?._id ?? session?.user?.id ?? null;
  const isConvexUserLoading = session?.user ? user === undefined : false;
  const isLoading = sessionLoading || isConvexUserLoading;
  const isAuthenticated = !!session?.user;

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    session,
    sessionUser: session?.user ?? null,
    authUserId,
    user: user ?? null,
    authUser: user ?? session?.user ?? null,
    role: user?.role ?? (session?.user as any)?.role,
    signOut,
    isAuthenticated,
    isLoading,
  };
}

// Main useConvexAuth hook that components are expecting
export function useConvexAuth() {
  const auth = useAuth();

  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    authUserId: auth.authUserId,
  };
}
