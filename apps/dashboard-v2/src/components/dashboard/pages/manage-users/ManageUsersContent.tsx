import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from '../../../../../../convex/_generated/api';
import { useAuth } from "../../../../hooks/useConvexAuth";
import { Pagination } from "@heroui/react";
import type {
  UserModalData,
  InviteModalData,
} from "./types/UserManagementTypes";
import {
  UserManagementTableSkeleton,
  MetricCardSkeleton,
} from "../../../ui/loading";

// Import refactored components
import UserStatsCards from "./components/UserStatsCards";
import UserFilters from "./components/UserFilters";
import UserTable from "./components/UserTable";
import UserModal from "./components/UserModal";
import InviteModal from "./components/InviteModal";
import AddMemberModal from "./components/AddMemberModal";
import { UserFilteringService } from "./utils/userFiltering";
import { UserPermissionService } from "./utils/userPermissions";
import { showToast } from "../../shared/utils/toast";
import type { User as ConvexUser } from "../../../../convex/schema";

export default function ManageUsersContent() {
  const { user, authUserId } = useAuth();
  const allUsers = useQuery(api.userManagement.getAllUsers);
  const updateUserMutation = useMutation(api.userManagement.updateUser);
  const updateIEEEEmailStatusMutation = useMutation(
    api.userManagement.updateIEEEEmailStatus,
  );
  const deleteUserMutation = useMutation(api.userManagement.deleteUser);
  const createInviteMutation = useMutation(api.userManagement.createInvite);
  const addExistingMemberMutation = useMutation(
    api.userManagement.addExistingMember,
  );

  const currentUserData = useQuery(
    api.userManagement.getUserByAuthId,
    authUserId ? { authUserId } : "skip",
  );

  // Transform users to match expected type
  const users = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.map((u) => ({
      ...u,
      id: u.id || u._id,
      name: u.name || "",
      email: u.email || "",
      role: u.role || "Member",
      position: u.position || "",
      status: u.status || "active",
      pid: u.pid || "",
      memberId: u.memberId || "",
      major: u.major || "",
      graduationYear: u.graduationYear || null,
      points: u.points || 0,
      joinDate: u.joinDate || null,
      signInMethod: u.signInMethod || null,
      hasIEEEEmail: u.hasIEEEEmail || false,
      ieeeEmail: u.ieeeEmail || "",
      ieeeEmailCreatedAt: u.ieeeEmailCreatedAt || null,
      ieeeEmailStatus: u.ieeeEmailStatus || "active",
    }));
  }, [allUsers]);

  const currentUser = useMemo(() => {
    if (!currentUserData) return null;
    return {
      ...currentUserData,
      id: currentUserData.id || currentUserData._id,
      name: currentUserData.name || "",
      email: currentUserData.email || "",
      role: currentUserData.role || "Member",
      position: currentUserData.position || "",
      status: currentUserData.status || "active",
      pid: currentUserData.pid || "",
      memberId: currentUserData.memberId || "",
      major: currentUserData.major || "",
      graduationYear: currentUserData.graduationYear || null,
      points: currentUserData.points || 0,
      joinDate: currentUserData.joinDate || null,
      signInMethod: currentUserData.signInMethod || null,
      hasIEEEEmail: currentUserData.hasIEEEEmail || false,
      ieeeEmail: currentUserData.ieeeEmail || "",
      ieeeEmailCreatedAt: currentUserData.ieeeEmailCreatedAt || null,
      ieeeEmailStatus: currentUserData.ieeeEmailStatus || "active",
    };
  }, [currentUserData]);

  const currentUserRole = currentUser?.role || "Member";

  // Filters and sorting
  const [filters, setFilters] = useState({
    searchTerm: "",
    roleFilter: "all",
    statusFilter: "all",
  });
  const [sortConfig, setSortConfig] = useState({
    field: "name",
    direction: "asc" as "asc" | "desc",
  });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserModalData | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 users per page

  // Reset pagination when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = UserFilteringService.filterUsers(users, filters);
    return UserFilteringService.sortUsers(filtered, sortConfig);
  }, [users, filters, sortConfig]);

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle user actions
  const handleEditUser = (user: any) => {
    setEditingUser({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "Member",
      position: user.position || "",
      status: user.status || "active",
      pid: user.pid || "",
      memberId: user.memberId || "",
      major: user.major || "",
      graduationYear: user.graduationYear || undefined,
      points: user.points || 0,
      // IEEE Email fields
      hasIEEEEmail: user.hasIEEEEmail || false,
      ieeeEmail: user.ieeeEmail || "",
      ieeeEmailCreatedAt: user.ieeeEmailCreatedAt || null,
      ieeeEmailStatus: user.ieeeEmailStatus || "active",
      // Team field (optional for officers)
      team: user.team,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData: UserModalData) => {
    if (!authUserId) {
      showToast.error("Not authenticated");
      return;
    }

    try {
      await updateUserMutation({
        userId: userData.id,
        name: userData.name,
        role: userData.role,
        position: userData.position || "",
        status: userData.status,
        pid: userData.pid || "",
        memberId: userData.memberId || "",
        major: userData.major || "",
        graduationYear: userData.graduationYear || undefined,
        team: userData.team,
        points: userData.points,
        updatedBy: authUserId,
      });

      setShowUserModal(false);
      setEditingUser(null);
      showToast.success("User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to update user",
      );
    }
  };

  const handleSendInvite = async (inviteData: InviteModalData) => {
    if (!authUserId) {
      showToast.error("Not authenticated");
      return;
    }

    try {
      const result = await createInviteMutation({
        name: inviteData.name,
        email: inviteData.email,
        role: inviteData.role,
        position: inviteData.position,
        message: inviteData.message,
        invitedBy: authUserId,
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
          inviteId: result.inviteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invite email");
      }

      setShowInviteModal(false);
      showToast.success("Invite sent successfully");
    } catch (error) {
      console.error("Error sending invite:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to send invite",
      );
    }
  };

  const handleAddExistingMember = async (
    userId: string,
    newRole: any,
    newPosition: string,
  ) => {
    if (!authUserId) {
      showToast.error("Not authenticated");
      return;
    }

    try {
      await addExistingMemberMutation({
        userId,
        newRole,
        newPosition,
        updatedBy: authUserId,
      });

      setShowAddMemberModal(false);
      showToast.success("Member added successfully");
    } catch (error) {
      console.error("Error adding member:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to add member",
      );
    }
  };

  const handleEmailAction = async (
    action: "disable" | "enable" | "delete",
    userId: string,
    email?: string,
  ) => {
    if (!authUserId || !email) {
      console.error("Missing required parameters for email action");
      return;
    }

    try {
      let endpoint = "";
      switch (action) {
        case "disable":
          endpoint = "/api/disable-ieee-email";
          break;
        case "enable":
          endpoint = "/api/enable-ieee-email";
          break;
        case "delete":
          endpoint = "/api/delete-ieee-email";
          break;
        default:
          throw new Error(`Invalid email action: ${action}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email,
          adminUserId: authUserId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        try {
          if (action === "delete") {
            await updateIEEEEmailStatusMutation({
              userId,
              hasIEEEEmail: false,
              ieeeEmail: undefined,
              ieeeEmailCreatedAt: undefined,
              ieeeEmailStatus: undefined,
              updatedBy: authUserId,
            });
          } else {
            await updateIEEEEmailStatusMutation({
              userId,
              ieeeEmailStatus: action === "disable" ? "disabled" : "active",
              updatedBy: authUserId,
            });
          }
        } catch (convexError) {
          console.error("Error updating Convex:", convexError);
        }

        setShowUserModal(false);
        setEditingUser(null);
        showToast.success(`Email ${action}d successfully`);
      } else {
        throw new Error(result.message || `Failed to ${action} email`);
      }
    } catch (error) {
      console.error(`Email ${action} failed:`, error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${action} email. Please try again.`;

      showToast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      showToast.error("User not found");
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
      await deleteUserMutation({
        userId,
      });

      showToast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast.error("Failed to delete user. Please try again.");
    }
  };

  // Show loading while data is fetching
  if (allUsers === undefined || (authUserId && currentUserData === undefined)) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <UserManagementTableSkeleton />
      </div>
    );
  }

  // If user doesn't have access, show access denied message
  if (
    user &&
    !UserPermissionService.hasUserManagementAccess(currentUserRole)
  ) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-red-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500">
            You don't have permission to access user management.
          </p>
          <p className="text-gray-500">
            Contact an administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if no user is logged in
  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-500">
            Please log in to access user management.
          </p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = useMemo(() => {
    return UserFilteringService.calculateStats(users);
  }, [users]);

  // Permission checks
  const permissions = useMemo(
    () => ({
      hasUserManagementAccess:
        UserPermissionService.hasUserManagementAccess(currentUserRole),
      canInviteWithRole: (role: any) =>
        UserPermissionService.canInviteWithRole(currentUserRole, role),
      getAvailableRoles: (isCurrentUser: boolean = false) =>
        UserPermissionService.getAvailableRoles(currentUserRole, isCurrentUser),
      canEditUserRole: (targetUser: any) =>
        UserPermissionService.canEditUserRole(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canEditUserPosition: (targetUser: any) =>
        UserPermissionService.canEditUserPosition(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canDeleteUser: (targetUser: any) =>
        UserPermissionService.canDeleteUser(currentUserRole, targetUser),
      isOAuthUser: (targetUserId: string) =>
        UserPermissionService.isOAuthUser(targetUserId, users, user),
      // Email management permissions
      canManageEmails: UserPermissionService.canManageEmails(currentUserRole),
      canEditUserEmail: (targetUser: any) =>
        UserPermissionService.canEditUserEmail(
          currentUserRole,
          targetUser,
          currentUser?.id,
        ),
      canDisableUserEmail: (targetUser: any) =>
        UserPermissionService.canDisableUserEmail(currentUserRole, targetUser),
      canDeleteUserEmail: (targetUser: any) =>
        UserPermissionService.canDeleteUserEmail(currentUserRole, targetUser),
    }),
    [currentUserRole, currentUser, users, user],
  );

  return (
    <div className="w-full">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <UserStatsCards stats={stats} />

        {/* Filters */}
        <UserFilters
          filters={filters}
          onFiltersChange={(newFilters) =>
            setFilters((prev) => ({ ...prev, ...newFilters }))
          }
          onShowInviteModal={() => setShowInviteModal(true)}
          onShowAddMemberModal={() => setShowAddMemberModal(true)}
          canManageUsers={permissions.hasUserManagementAccess}
        />

        {/* Users Table */}
        <UserTable
          users={paginatedUsers}
          sortConfig={sortConfig}
          onSort={(field) =>
            setSortConfig((prev) => ({
              field,
              direction:
                prev.field === field && prev.direction === "asc"
                  ? "desc"
                  : "asc",
            }))
          }
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
          permissions={permissions}
          currentUserId={currentUser?.id}
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(endIndex, totalItems)}
                  </span>{" "}
                  of <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <Pagination
                total={totalPages}
                page={currentPage}
                onChange={setCurrentPage}
                showControls
                showShadow
                color="primary"
              />
            </div>
          </div>
        )}

        {/* User Modal */}
        <UserModal
          isOpen={showUserModal}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
          editingUser={editingUser}
          availableRoles={permissions.getAvailableRoles(
            editingUser?.id === currentUser?.id,
          )}
          canEditRole={
            editingUser ? permissions.canEditUserRole(editingUser as any) : true
          }
          canEditPosition={
            editingUser
              ? permissions.canEditUserPosition(editingUser as any)
              : true
          }
          canEditPoints={currentUserRole === "Administrator"}
          canManageEmails={permissions.canManageEmails}
          onEmailAction={handleEmailAction}
          loading={false}
          currentUserId={currentUser?.id}
        />

        {/* Invite Modal */}
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSave={handleSendInvite}
          availableRoles={permissions.getAvailableRoles(false)}
          loading={false}
        />

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onSave={handleAddExistingMember}
          availableRoles={permissions.getAvailableRoles(false)}
          loading={false}
        />
      </div>
    </div>
  );
}
