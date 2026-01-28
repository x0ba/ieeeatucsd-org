import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";
import type {
  SponsorDomain,
  SponsorTier,
} from "../../shared/types/constitution";
import { showToast } from "../../../shared/utils/toast";

export interface SponsorDomainWithId extends SponsorDomain {
  _id: string;
}

export interface SponsorDomainFormData {
  domain: string;
  organizationName: string;
  sponsorTier: SponsorTier;
}

export const useSponsorDomains = () => {
  const domains = useQuery(api.sponsorDomains.list, {});
  const createMutation = useMutation(api.sponsorDomains.create);
  const updateMutation = useMutation(api.sponsorDomains.update);
  const deleteMutation = useMutation(api.sponsorDomains.remove);

  const loading = domains === undefined;

  // Add a new sponsor domain
  const addDomain = async (formData: SponsorDomainFormData) => {
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
        id: domainId as any,
        domain: formData.domain,
        organizationName: formData.organizationName,
        sponsorTier: formData.sponsorTier,
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
      await deleteMutation({ id: domainId as any });
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
