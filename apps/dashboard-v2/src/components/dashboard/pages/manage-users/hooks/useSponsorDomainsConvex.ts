import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import type { SponsorTier } from "../../../../../../src/lib/types";
import { showToast } from "../../../shared/utils/toast";

// Define SponsorDomain locally since it's Convex-specific
export interface SponsorDomain {
  domain: string;
  organizationName: string;
  sponsorTier: SponsorTier;
  createdAt: number;
  createdBy: string;
  lastModified?: number;
  lastModifiedBy?: string;
}

export interface SponsorDomainWithId extends SponsorDomain {
  _id: string;
}

export interface SponsorDomainFormData {
  domain: string;
  organizationName: string;
  sponsorTier: SponsorTier;
}

export const useSponsorDomains = (currentUserId?: string) => {
  const domains = useQuery(api.userManagement.getSponsorDomains);
  const createMutation = useMutation(api.userManagement.createSponsorDomain);
  const updateMutation = useMutation(api.userManagement.updateSponsorDomain);
  const deleteMutation = useMutation(api.userManagement.deleteSponsorDomain);

  const loading = domains === undefined;

  // Add a new sponsor domain
  const addDomain = async (formData: SponsorDomainFormData) => {
    if (!currentUserId) {
      showToast.error("User not authenticated");
      return;
    }

    try {
      // Validate domain format
      if (!formData.domain.startsWith("@")) {
        showToast.error("Domain must start with @");
        return;
      }

      if (formData.domain.length < 3) {
        showToast.error("Domain must have at least one character after @");
        return;
      }

      // Check for duplicate domain (Convex will also check, but we check locally for better UX)
      if (domains) {
        const existingDomain = domains.find(
          (d) => d.domain.toLowerCase() === formData.domain.toLowerCase(),
        );
        if (existingDomain) {
          showToast.error("This domain already exists");
          return;
        }
      }

      await createMutation({
        domain: formData.domain,
        organizationName: formData.organizationName,
        sponsorTier: formData.sponsorTier,
        createdBy: currentUserId,
      });
      showToast.success("Sponsor domain added successfully");
    } catch (err: any) {
      console.error("Error adding sponsor domain:", err);
      showToast.error(err.message || "Failed to add sponsor domain");
    }
  };

  // Update an existing sponsor domain
  const updateDomain = async (
    domainId: string,
    formData: SponsorDomainFormData,
  ) => {
    if (!currentUserId) {
      showToast.error("User not authenticated");
      return;
    }

    try {
      // Validate domain format
      if (!formData.domain.startsWith("@")) {
        showToast.error("Domain must start with @");
        return;
      }

      if (formData.domain.length < 3) {
        showToast.error("Domain must have at least one character after @");
        return;
      }

      // Check for duplicate domain (excluding current domain)
      if (domains) {
        const existingDomain = domains.find(
          (d) =>
            d.domain.toLowerCase() === formData.domain.toLowerCase() &&
            d._id !== domainId,
        );
        if (existingDomain) {
          showToast.error("This domain already exists");
          return;
        }
      }

      await updateMutation({
        domainId: domainId as any,
        organizationName: formData.organizationName,
        sponsorTier: formData.sponsorTier,
        updatedBy: currentUserId,
      });

      showToast.success("Sponsor domain updated successfully");
    } catch (err: any) {
      console.error("Error updating sponsor domain:", err);
      showToast.error(err.message || "Failed to update sponsor domain");
    }
  };

  // Delete a sponsor domain
  const deleteDomain = async (domainId: string) => {
    try {
      await deleteMutation({ domainId: domainId as any });
      showToast.success("Sponsor domain deleted successfully");
    } catch (err: any) {
      console.error("Error deleting sponsor domain:", err);
      showToast.error(err.message || "Failed to delete sponsor domain");
    }
  };

  return {
    domains: domains || [],
    loading,
    addDomain,
    updateDomain,
    deleteDomain,
  };
};
