import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../../../hooks/useConvexAuth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type {
  Constitution,
  ConstitutionSection,
} from "../../../shared/types/constitution";
import { useConstitutionAudit } from "./useConstitutionAudit";

export const useConstitutionData = () => {
  const { authUserId, user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const constitutionId = "ieee-ucsd-constitution";

  const constitution = useQuery(api.constitutions.getConstitution, { constitutionId });
  const sections = useQuery(api.constitutions.getSections, { constitutionId }) || [];

  const initializeConstitution = useMutation(api.constitutions.initializeConstitution);
  const addSectionMutation = useMutation(api.constitutions.addSection);
  const updateSectionMutation = useMutation(api.constitutions.updateSection);
  const deleteSectionMutation = useMutation(api.constitutions.deleteSection);

  // Initialize audit functionality
  const { createAuditEntry } = useConstitutionAudit(constitutionId);

  // Initialize constitution if not exists
  useEffect(() => {
    const initialize = async () => {
      if (!authUserId) return;

      try {
        await initializeConstitution({
          constitutionId,
          title: "IEEE at UC San Diego Constitution",
          organizationName: "IEEE at UC San Diego",
          createdBy: authUserId,
        });
      } catch (err) {
        console.error("Error initializing constitution:", err);
      }
    };

    initialize();
  }, [authUserId, initializeConstitution]);

  // Update lastSaved with the actual last modification time from the document
  useEffect(() => {
    if (!constitution && sections.length === 0) {
      setLastSaved(null);
      return;
    }

    const timestamps: number[] = [];

    // Add constitution's lastModified if it exists
    if (constitution?.lastModified) {
      timestamps.push(constitution.lastModified);
    }

    // Add all sections' lastModified timestamps
    sections.forEach((section) => {
      if (section.lastModified) {
        timestamps.push(section.lastModified);
      }
    });

    // Find the most recent timestamp
    if (timestamps.length > 0) {
      const mostRecent = Math.max(...timestamps);
      setLastSaved(new Date(mostRecent));
    }
  }, [constitution, sections]);

  const addSection = async (
    type: ConstitutionSection["type"],
    parentId?: string,
    customTitle?: string,
    customContent?: string,
  ) => {
    if (!authUserId) return;

    const newOrder =
      sections.length > 0 ? Math.max(...sections.map((s) => s.order)) + 1 : 1;

    let title = customTitle || "";
    let articleNumber: number | undefined;
    let sectionNumber: number | undefined;
    let amendmentNumber: number | undefined;

    // Calculate numbers for ordering regardless of whether custom title is provided
    const existingArticles = sections.filter(
      (s) => s.type === "article",
    ).length;
    const existingAmendments = sections.filter(
      (s) => s.type === "amendment",
    ).length;

    switch (type) {
      case "article":
        articleNumber = existingArticles + 1;
        break;
      case "section":
        if (parentId) {
          const parentSections = sections.filter(
            (s) => s.parentId === parentId && s.type === "section",
          ).length;
          sectionNumber = parentSections + 1;
        }
        break;
      case "amendment":
        amendmentNumber = existingAmendments + 1;
        break;
    }

    try {
      const result = await addSectionMutation({
        constitutionId,
        type,
        title,
        content: customContent || "",
        order: newOrder,
        parentId,
        articleNumber,
        sectionNumber,
        amendmentNumber,
        createdBy: authUserId,
      });

      // Create audit entry for section creation
      const newSection: ConstitutionSection = {
        _id: result?._id || "",
        type,
        title,
        content: customContent || "",
        order: newOrder,
        ...(parentId && { parentId }),
        ...(articleNumber && { articleNumber }),
        ...(sectionNumber && { sectionNumber }),
        ...(amendmentNumber && { amendmentNumber }),
        createdAt: result?.createdAt || Date.now(),
        lastModified: result?.lastModified || Date.now(),
        lastModifiedBy: authUserId,
      };

      await createAuditEntry(
        "create",
        result?._id || "",
        undefined,
        newSection,
      );
    } catch (error) {
      console.error("Error adding section:", error);
      setError("Error adding section");
    }
  };

  const updateSection = async (
    sectionId: string,
    updates: Partial<ConstitutionSection>,
  ) => {
    if (!authUserId) return;

    try {
      setSaveStatus("saving");

      // Get the current section data for audit logging
      const currentSection = sections.find((s) => s._id === sectionId);

      const result = await updateSectionMutation({
        sectionId: sectionId as any,
        title: updates.title,
        content: updates.content,
        updatedBy: authUserId,
      });

      // Create audit entry for section update
      if (currentSection) {
        const afterState = { ...currentSection, ...updates };
        await createAuditEntry("update", sectionId, currentSection, afterState);
      }

      setSaveStatus("saved");
      // lastSaved will be updated automatically by the useEffect that tracks document timestamps
    } catch (error) {
      console.error("Error updating section:", error);
      setSaveStatus("error");
      setError("Error updating section");
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!authUserId) return;

    try {
      // Get the section data before deletion for audit logging
      const sectionData = sections.find((s) => s._id === sectionId);

      await deleteSectionMutation({
        sectionId: sectionId as any,
      });

      // Create audit entry for section deletion
      if (sectionData) {
        await createAuditEntry("delete", sectionId, sectionData, undefined);
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      setError("Error deleting section");
    }
  };

  const isLoading = constitution === undefined;

  return {
    // State
    constitution,
    sections,
    saveStatus,
    lastSaved,
    isLoading,

    // Functions
    addSection,
    updateSection,
    deleteSection,

    // Constants
    constitutionId,
    user,

    // Errors
    error,
  };
};
