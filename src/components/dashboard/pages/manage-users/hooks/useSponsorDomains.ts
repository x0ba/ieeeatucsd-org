import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../../../../firebase/client";
import { useAuthState } from "react-firebase-hooks/auth";
import type {
  SponsorDomain,
  SponsorTier,
} from "../../../shared/types/firestore";

export interface SponsorDomainWithId extends SponsorDomain {
  id: string;
}

export interface SponsorDomainFormData {
  domain: string;
  organizationName: string;
  sponsorTier: SponsorTier;
}

export const useSponsorDomains = () => {
  const [user] = useAuthState(auth);
  const [domains, setDomains] = useState<SponsorDomainWithId[]>([]);
  const [loading, setLoading] = useState(false); // Start false to show cached data immediately
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all sponsor domains
  const fetchDomains = async () => {
    try {
      setLoading(true);
      const domainsRef = collection(db, "sponsorDomains");
      const q = query(domainsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const domainsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SponsorDomainWithId[];

      setDomains(domainsList);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching sponsor domains:", err);
      setError(err.message || "Failed to fetch sponsor domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  // Add a new sponsor domain
  const addDomain = async (formData: SponsorDomainFormData) => {
    if (!user) {
      setError("You must be logged in to add a sponsor domain");
      return;
    }

    try {
      // Validate domain format
      if (!formData.domain.startsWith("@")) {
        setError("Domain must start with @");
        return;
      }

      if (formData.domain.length < 3) {
        setError("Domain must have at least one character after @");
        return;
      }

      // Check for duplicate domain
      const existingDomain = domains.find(
        (d) => d.domain.toLowerCase() === formData.domain.toLowerCase(),
      );
      if (existingDomain) {
        setError("This domain already exists");
        return;
      }

      const domainData: Omit<SponsorDomain, "lastModified" | "lastModifiedBy"> =
        {
          domain: formData.domain.toLowerCase(),
          organizationName: formData.organizationName,
          sponsorTier: formData.sponsorTier,
          createdAt: Timestamp.now(),
          createdBy: user.uid,
        };

      await addDoc(collection(db, "sponsorDomains"), domainData);
      setSuccess("Sponsor domain added successfully");
      setError(null);
      await fetchDomains();
    } catch (err: any) {
      console.error("Error adding sponsor domain:", err);
      setError(err.message || "Failed to add sponsor domain");
    }
  };

  // Update an existing sponsor domain
  const updateDomain = async (
    domainId: string,
    formData: SponsorDomainFormData,
  ) => {
    if (!user) {
      setError("You must be logged in to update a sponsor domain");
      return;
    }

    try {
      // Validate domain format
      if (!formData.domain.startsWith("@")) {
        setError("Domain must start with @");
        return;
      }

      if (formData.domain.length < 3) {
        setError("Domain must have at least one character after @");
        return;
      }

      // Check for duplicate domain (excluding current domain)
      const existingDomain = domains.find(
        (d) =>
          d.domain.toLowerCase() === formData.domain.toLowerCase() &&
          d.id !== domainId,
      );
      if (existingDomain) {
        setError("This domain already exists");
        return;
      }

      const domainRef = doc(db, "sponsorDomains", domainId);
      await updateDoc(domainRef, {
        domain: formData.domain.toLowerCase(),
        organizationName: formData.organizationName,
        sponsorTier: formData.sponsorTier,
        lastModified: Timestamp.now(),
        lastModifiedBy: user.uid,
      });

      setSuccess("Sponsor domain updated successfully");
      setError(null);
      await fetchDomains();
    } catch (err: any) {
      console.error("Error updating sponsor domain:", err);
      setError(err.message || "Failed to update sponsor domain");
    }
  };

  // Delete a sponsor domain
  const deleteDomain = async (domainId: string) => {
    if (!user) {
      setError("You must be logged in to delete a sponsor domain");
      return;
    }

    try {
      const domainRef = doc(db, "sponsorDomains", domainId);
      await deleteDoc(domainRef);
      setSuccess("Sponsor domain deleted successfully");
      setError(null);
      await fetchDomains();
    } catch (err: any) {
      console.error("Error deleting sponsor domain:", err);
      setError(err.message || "Failed to delete sponsor domain");
    }
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    domains,
    loading,
    error,
    success,
    addDomain,
    updateDomain,
    deleteDomain,
    clearMessages,
    fetchDomains,
  };
};
