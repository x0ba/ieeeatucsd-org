import type { UserRole } from "../../../shared/types/firestore";

export class SponsorPermissionService {
  /**
   * Check if user has sponsor access to resume database
   * Sponsors and Administrators can access the resume database
   */
  static hasSponsorAccess(userRole: UserRole | null): boolean {
    if (!userRole) return false;
    return userRole === "Sponsor" || userRole === "Administrator";
  }

  /**
   * Check if user can view resume database
   */
  static canViewResumeDatabase(userRole: UserRole | null): boolean {
    return this.hasSponsorAccess(userRole);
  }
}
