import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import type { Id } from "#convex/_generated/dataModel";
import { useAuth } from "../../../../../hooks/useConvexAuth";
import type { Link } from "../../../shared/types/constitution";
import { LinkPermissionService } from "../utils/linkPermissions";
import { showToast } from "../../../shared/utils/toast";

export interface LinkFormData {
  url: string;
  title: string;
  category: string;
  description?: string;
  iconUrl?: string;
  shortUrl?: string;
  publishDate?: number | null;
  expireDate?: number | null;
}

export function useLinksManagement() {
  const { user, role: currentUserRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  // Mutation hooks
  const createLinkMutation = useMutation(api.links.create);
  const updateLinkMutation = useMutation(api.links.update);
  const deleteLinkMutation = useMutation(api.links.remove);

  // Fetch all links using Convex query
  const allLinks = useQuery(api.links.list) || [];

  // Filter links by date visibility only (for category counts)
  const visibleLinks = useMemo(() => {
    const now = Date.now();

    return allLinks.filter((link) => {
      // Date visibility filter - only show if within publish/expire window
      // Officers can see all links regardless of dates
      if (!LinkPermissionService.canManageLinks(currentUserRole)) {
        // Check publish date - link should be published
        if (link.publishDate && link.publishDate > now) {
          return false; // Not yet published
        }

        // Check expire date - link should not be expired
        if (link.expireDate && link.expireDate < now) {
          return false; // Already expired
        }
      }

      return true;
    });
  }, [allLinks, currentUserRole]);

  // Filter links based on search and category
  const filteredLinks = useMemo(() => {
    return visibleLinks.filter((link) => {
      const matchesSearch =
        searchTerm === "" ||
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || link.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [visibleLinks, searchTerm, categoryFilter]);

  // Create a new link
  const createLink = async (linkData: LinkFormData) => {
    if (!user) {
      showToast.error("You must be logged in to create links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      showToast.error("You don't have permission to create links");
      return;
    }

    try {
      setLoading(true);

      await createLinkMutation(linkData);
      showToast.success("Link created successfully!");
    } catch (error) {
      console.error("Error creating link:", error);
      showToast.error("Failed to create link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update an existing link
  const updateLink = async (linkId: string, linkData: LinkFormData) => {
    if (!user) {
      showToast.error("You must be logged in to update links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      showToast.error("You don't have permission to update links");
      return;
    }

    try {
      setLoading(true);

      await updateLinkMutation({
        linkId: linkId as Id<"links">,
        url: linkData.url,
        title: linkData.title,
        category: linkData.category,
        description: linkData.description,
        iconUrl: linkData.iconUrl,
        shortUrl: linkData.shortUrl,
        publishDate: linkData.publishDate,
        expireDate: linkData.expireDate,
      });

      showToast.success("Link updated successfully!");
    } catch (error) {
      console.error("Error updating link:", error);
      showToast.error("Failed to update link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a link
  const deleteLink = async (linkId: string) => {
    if (!user) {
      showToast.error("You must be logged in to delete links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      showToast.error("You don't have permission to delete links");
      return;
    }

    try {
      setLoading(true);

      await deleteLinkMutation({ linkId: linkId as Id<"links"> });
      showToast.success("Link deleted successfully!");
    } catch (error) {
      console.error("Error deleting link:", error);
      showToast.error("Failed to delete link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Permission checks
  const canManageLinks = LinkPermissionService.canManageLinks(currentUserRole);

  return {
    // Data
    links: filteredLinks,
    visibleLinks, // Links filtered by date visibility only (for category counts)
    allLinks,
    currentUserRole,

    // State
    loading: loading,
    searchTerm,
    categoryFilter,

    // Actions
    createLink,
    updateLink,
    deleteLink,
    setSearchTerm,
    setCategoryFilter,

    // Permissions
    canManageLinks,

    // Auth
    user,
  };
}
