import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../../../../firebase/client";
import { useAuthState } from "react-firebase-hooks/auth";
import type { Link, UserRole } from "../../../shared/types/firestore";
import { LinkPermissionService } from "../utils/linkPermissions";

export interface LinkFormData {
  url: string;
  title: string;
  category: string;
  description?: string;
  iconUrl?: string;
}

export function useLinksManagement() {
  const [user, userLoading] = useAuthState(auth);
  const [links, setLinks] = useState<(Link & { id: string })[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch current user role
  useEffect(() => {
    if (!user) {
      setCurrentUserRole(null);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || "Member");
        } else {
          setCurrentUserRole("Member");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setCurrentUserRole("Member");
      }
    };

    fetchUserRole();
  }, [user]);

  // Fetch links with real-time updates
  useEffect(() => {
    const linksQuery = query(
      collection(db, "links"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      linksQuery,
      (snapshot) => {
        const linksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Link & { id: string })[];

        setLinks(linksData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching links:", error);
        setError("Failed to load links. Please try again.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Filter links based on search and category
  const filteredLinks = useMemo(() => {
    const now = Timestamp.now();

    return links.filter((link) => {
      // Date visibility filter - only show if within publish/expire window
      // Officers can see all links regardless of dates
      if (!LinkPermissionService.canManageLinks(currentUserRole)) {
        // Check publish date - link should be published
        if (link.publishDate && link.publishDate.toMillis() > now.toMillis()) {
          return false; // Not yet published
        }

        // Check expire date - link should not be expired
        if (link.expireDate && link.expireDate.toMillis() < now.toMillis()) {
          return false; // Already expired
        }
      }

      const matchesSearch =
        searchTerm === "" ||
        link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.url.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || link.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [links, searchTerm, categoryFilter, currentUserRole]);

  // Create a new link
  const createLink = async (linkData: LinkFormData) => {
    if (!user) {
      setError("You must be logged in to create links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      setError("You don't have permission to create links");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build the link object, omitting undefined fields
      const newLink: any = {
        url: linkData.url,
        title: linkData.title,
        category: linkData.category,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
        lastModified: Timestamp.now(),
        lastModifiedBy: user.uid,
      };

      // Only add optional fields if they have values
      if (linkData.description) {
        newLink.description = linkData.description;
      }
      if (linkData.iconUrl) {
        newLink.iconUrl = linkData.iconUrl;
      }

      await addDoc(collection(db, "links"), newLink);
      setSuccess("Link created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error creating link:", error);
      setError("Failed to create link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update an existing link
  const updateLink = async (linkId: string, linkData: LinkFormData) => {
    if (!user) {
      setError("You must be logged in to update links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      setError("You don't have permission to update links");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build the update object, omitting undefined fields
      const updateData: any = {
        url: linkData.url,
        title: linkData.title,
        category: linkData.category,
        lastModified: Timestamp.now(),
        lastModifiedBy: user.uid,
      };

      // Only add optional fields if they have values
      if (linkData.description) {
        updateData.description = linkData.description;
      }
      if (linkData.iconUrl) {
        updateData.iconUrl = linkData.iconUrl;
      }

      const linkRef = doc(db, "links", linkId);
      await updateDoc(linkRef, updateData);

      setSuccess("Link updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error updating link:", error);
      setError("Failed to update link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete a link
  const deleteLink = async (linkId: string) => {
    if (!user) {
      setError("You must be logged in to delete links");
      return;
    }

    if (!LinkPermissionService.canManageLinks(currentUserRole)) {
      setError("You don't have permission to delete links");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await deleteDoc(doc(db, "links", linkId));
      setSuccess("Link deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error deleting link:", error);
      setError("Failed to delete link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Permission checks
  const canManageLinks = LinkPermissionService.canManageLinks(currentUserRole);

  return {
    // Data
    links: filteredLinks,
    allLinks: links,
    currentUserRole,

    // State
    loading: loading || userLoading,
    error,
    success,
    searchTerm,
    categoryFilter,

    // Actions
    createLink,
    updateLink,
    deleteLink,
    setSearchTerm,
    setCategoryFilter,
    clearMessages,

    // Permissions
    canManageLinks,

    // Auth
    user,
  };
}
