import type { UserRole } from "../../../shared/types/firestore";

export class LinkPermissionService {
  /**
   * Check if user has permission to manage links (create, update, delete)
   */
  static canManageLinks(userRole: UserRole | null): boolean {
    if (!userRole) return false;
    return (
      userRole === "General Officer" ||
      userRole === "Executive Officer" ||
      userRole === "Administrator"
    );
  }

  /**
   * Check if user can view links (all authenticated users)
   */
  static canViewLinks(userRole: UserRole | null): boolean {
    return userRole !== null;
  }

  /**
   * Check if user can edit a specific link
   */
  static canEditLink(
    userRole: UserRole | null,
    linkCreatedBy: string,
    currentUserId?: string,
  ): boolean {
    // Officers and admins can edit any link
    if (this.canManageLinks(userRole)) {
      return true;
    }
    return false;
  }

  /**
   * Check if user can delete a specific link
   */
  static canDeleteLink(
    userRole: UserRole | null,
    linkCreatedBy: string,
    currentUserId?: string,
  ): boolean {
    // Officers and admins can delete any link
    if (this.canManageLinks(userRole)) {
      return true;
    }
    return false;
  }
}

/**
 * Preset link categories (suggestions)
 */
export const PRESET_CATEGORIES = [
  "General",
  "Projects",
  "Events",
  "Workshops",
] as const;

/**
 * Get color scheme for a category
 * Returns a color scheme based on the category name hash
 */
export function getCategoryColor(category: string): {
  color: string;
  bgColor: string;
} {
  // Predefined colors for preset categories
  const presetColors: Record<string, { color: string; bgColor: string }> = {
    General: {
      color: "text-blue-700",
      bgColor: "bg-blue-100",
    },
    Projects: {
      color: "text-purple-700",
      bgColor: "bg-purple-100",
    },
    Events: {
      color: "text-green-700",
      bgColor: "bg-green-100",
    },
    Workshops: {
      color: "text-orange-700",
      bgColor: "bg-orange-100",
    },
  };

  // Return preset color if available
  if (presetColors[category]) {
    return presetColors[category];
  }

  // Generate color based on category name hash for custom categories
  const colors = [
    { color: "text-pink-700", bgColor: "bg-pink-100" },
    { color: "text-indigo-700", bgColor: "bg-indigo-100" },
    { color: "text-teal-700", bgColor: "bg-teal-100" },
    { color: "text-amber-700", bgColor: "bg-amber-100" },
    { color: "text-cyan-700", bgColor: "bg-cyan-100" },
    { color: "text-rose-700", bgColor: "bg-rose-100" },
    { color: "text-emerald-700", bgColor: "bg-emerald-100" },
    { color: "text-violet-700", bgColor: "bg-violet-100" },
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;

  return colors[index];
}
