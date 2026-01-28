import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import type { UserRole } from "../../../../../lib/types";
import type { Doc } from "#convex/_generated/dataModel";
type FirestoreUser = Doc<"users">;
import type {
  UserModalData,
  InviteModalData,
  UserFilters,
  SortConfig,
} from "../types/UserManagementTypes";
import { UserFilteringService } from "../utils/userFiltering";
import { UserPermissionService } from "../utils/userPermissions";
import { useAuth } from "../../../../hooks/useConvexAuth";

export const useUserManagement = () => {
  const { user: authUser } = useAuth();
  const allUsers = useQuery(api.userManagement.getAllUsers);

  // Filters and sorting
  const [filters, setFilters] = useState<UserFilters>({
    searchTerm: "",
    roleFilter: "all",
    statusFilter: "all",
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "name",
    direction: "asc",
  });

  // Get current user from all users
  const currentUser = useMemo(() => {
    if (!authUser || !allUsers) return null;
    return allUsers.find((u) => u.authUserId === authUser.id) || null;
  }, [authUser, allUsers]);

  const currentUserRole = currentUser?.role || "Member";

  // Filter users by role (only include specific roles)
  const users = useMemo(
    () =>
      allUsers?.filter(
        (u) =>
          u.role === "Member" ||
          u.role === "General Officer" ||
          u.role === "Executive Officer" ||
          u.role === "Administrator" ||
          u.role === "Sponsor",
      ) || [],
    [allUsers],
  );

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = UserFilteringService.filterUsers(users, filters);
    return UserFilteringService.sortUsers(filtered, sortConfig);
  }, [users, filters, sortConfig]);

  const updateUserMutation = useMutation(api.userManagement.updateUser);
  const deleteUserMutation = useMutation(api.userManagement.deleteUser);
  const createInviteMutation = useMutation(api.userManagement.createInvite);
  const addExistingMemberMutation = useMutation(
    api.userManagement.addExistingMember,
  );

  // Update user
  const updateUser = async (userData: UserModalData) => {
    if (!userData.id) return;

    try {
      const targetUser = users.find((u) => u.id === userData.id);
      if (!targetUser) {
        showToast.error("User not found");
        return;
      }

      // Check permissions
      if (
        !UserPermissionService.canEditUserRole(
          currentUserRole,
          targetUser,
          currentUser?.id,
        )
      ) {
        showToast.error(
          "You do not have permission to change this user's role",
        );
        return;
      }

      if (
        !UserPermissionService.canEditUserPosition(
          currentUserRole,
          targetUser,
          currentUser?.id,
        )
      ) {
        showToast.error(
          "You do not have permission to change this user's position",
        );
        return;
      }

      // Normalize major name before saving
      const normalizedMajor = normalizeMajorName(userData.major);

      await updateUserMutation({
        userId: userData.id,
        name: userData.name,
        role: userData.role,
        position: userData.position,
        status: userData.status,
        pid: userData.pid,
        memberId: userData.memberId,
        major: normalizedMajor || "",
        graduationYear: userData.graduationYear,
        team: userData.team,
        points: userData.points,
        updatedBy: currentUser?.id || "",
      });

      // Sync to public profile
      try {
        const publicProfileData: any = {
          name: userData.name,
          position: userData.position || "",
        };

        if (
          currentUserRole === "Administrator" &&
          userData.points !== undefined
        ) {
          publicProfileData.points = userData.points;
        }

        await PublicProfileService.syncPublicProfile(
          userData.id,
          publicProfileData,
        );
      } catch (error) {
        console.error("Error syncing public profile:", error);
      }

      showToast.success("User updated successfully");
      // Data will auto-update via Convex reactivity
    } catch (error) {
      console.error("Error updating user:", error);
      showToast.error(
        error instanceof Error
          ? error.message
          : "Failed to update user. Please try again.",
      );
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      showToast.error("User not found");
      return;
    }

    if (!UserPermissionService.canDeleteUser(currentUserRole, targetUser)) {
      showToast.error("You do not have permission to delete this user");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete ${targetUser.name}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteUserMutation({ userId });

      showToast.success("User deleted successfully");
      // Data will auto-update via Convex reactivity
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast.error("Failed to delete user. Please try again.");
    }
  };

  // Send invite
  const sendInvite = async (inviteData: InviteModalData) => {
    try {
      if (
        !UserPermissionService.canInviteWithRole(
          currentUserRole,
          inviteData.role,
        )
      ) {
        showToast.error(
          "You do not have permission to invite users with this role",
        );
        return;
      }

      // Create invite record in Convex
      const { inviteId } = await createInviteMutation({
        name: inviteData.name,
        email: inviteData.email,
        role: inviteData.role,
        position: inviteData.position,
        message: inviteData.message,
        invitedBy: currentUser?.id || "",
      });

      // Send email via API
      const response = await fetch("/api/email/send-user-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role,
          position: inviteData.position,
          message: inviteData.message,
          inviteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invite email");
      }

      showToast.success("Invite sent successfully");
    } catch (error) {
      console.error("Error sending invite:", error);
      showToast.error("Failed to send invite. Please try again.");
    }
  };

  // Add existing member (promote to officer)
  const addExistingMember = async (
    memberId: string,
    newRole: UserRole,
    newPosition: string,
  ) => {
    try {
      await addExistingMemberMutation({
        userId: memberId,
        newRole,
        newPosition,
        updatedBy: currentUser?.id || "",
      });

      // Sync to public profile
      try {
        await PublicProfileService.syncPublicProfile(memberId, {
          position: newPosition,
        });
      } catch (error) {
        console.error("Error syncing public profile:", error);
      }

      showToast.success("Member added successfully");
      // Data will auto-update via Convex reactivity
    } catch (error) {
      console.error("Error adding member:", error);
      showToast.error("Failed to add member. Please try again.");
    }
  };

  // Update filters
  const updateFilters = (newFilters: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Update sort config
  const updateSort = (field: string) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Calculate stats
  const stats = useMemo(() => {
    return UserFilteringService.calculateStats(users);
  }, [users]);

  // Permission checks
  const permissions = useMemo(
    () => ({
      hasUserManagementAccess:
        UserPermissionService.hasUserManagementAccess(currentUserRole),
      canInviteWithRole: (role: UserRole) =>
        UserPermissionService.canInviteWithRole(currentUserRole, role),
      getAvailableRoles: (isCurrentUser: boolean = false) =>
        UserPermissionService.getAvailableRoles(currentUserRole, isCurrentUser),
      canEditUserRole: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canEditUserRole(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canEditUserPosition: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canEditUserPosition(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canDeleteUser: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canDeleteUser(currentUserRole, targetUser),
      isOAuthUser: (targetUserId: string) =>
        UserPermissionService.isOAuthUser(targetUserId, users, authUser),
      // Email management permissions
      canManageEmails: UserPermissionService.canManageEmails(currentUserRole),
      canEditUserEmail: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canEditUserEmail(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canDisableUserEmail: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canDisableUserEmail(currentUserRole, targetUser),
      canDeleteUserEmail: (targetUser: FirestoreUser & { id: string }) =>
        UserPermissionService.canDeleteUserEmail(currentUserRole, targetUser),
    }),
    [currentUserRole, currentUser, users, authUser],
  );

  return {
    // Data
    users,
    filteredUsers,
    currentUser,
    currentUserRole,
    stats,

    // State
    loading: !allUsers,
    filters,
    sortConfig,

    // Actions
    updateUser,
    deleteUser,
    sendInvite,
    addExistingMember,
    updateFilters,
    updateSort,

    // Permissions
    permissions,

    // Auth
    user: authUser,
  };
};
