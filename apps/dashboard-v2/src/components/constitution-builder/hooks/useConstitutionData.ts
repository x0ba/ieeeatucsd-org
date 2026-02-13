import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ConstitutionDocumentSaveResult,
  ConstitutionDocumentSectionInput,
  ConstitutionSection,
  SaveStatus,
} from "../types";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useState } from "react";

export function useConstitutionData() {
  const { isAuthenticated, logtoId } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [ensuringDefault, setEnsuringDefault] = useState(false);

  // Get or ensure constitution exists
  const constitution = useQuery(
    api.constitutions.getDefault,
    logtoId ? { logtoId } : "skip",
  );
  const ensureConstitution = useMutation(api.constitutions.ensureDefaultConstitution);

  // Get sections - only when we have a valid constitution ID
  const sections = useQuery(
    api.constitutions.getSections,
    constitution ? { constitutionId: constitution._id } : "skip",
  );

  // Mutations
  const addSection = useMutation(api.constitutions.addSection);
  const updateSection = useMutation(api.constitutions.updateSection);
  const deleteSection = useMutation(api.constitutions.deleteSection);
  const reorderSection = useMutation(api.constitutions.reorderSection);
  const syncDocumentSections = useMutation(
    api.constitutions.syncDocumentSections,
  );

  const constitutionLoading =
    Boolean(isAuthenticated && logtoId) && constitution === undefined;
  const sectionsLoading = Boolean(constitution) && sections === undefined;
  const needsInitialization = Boolean(
    isAuthenticated && logtoId && !initialized,
  );
  const isLoading =
    constitutionLoading ||
    sectionsLoading ||
    ensuringDefault ||
    needsInitialization ||
    constitution === null;
  const saveStatus: SaveStatus = isLoading ? "idle" : "saved";

  // Auto-initialize constitution when authenticated
  useEffect(() => {
    if (!isAuthenticated || !logtoId) {
      setInitialized(false);
      setEnsuringDefault(false);
      return;
    }

    if (constitution && !initialized) {
      setInitialized(true);
      return;
    }

    if (constitution === null && !ensuringDefault) {
      setEnsuringDefault(true);
      ensureConstitution({ logtoId })
        .then(() => setInitialized(true))
        .finally(() => setEnsuringDefault(false));
    }
  }, [
    isAuthenticated,
    logtoId,
    initialized,
    constitution,
    ensureConstitution,
    ensuringDefault,
  ]);

  const handleAddSection = async (
    type: ConstitutionSection["type"],
    parentId?: string,
    title?: string,
    content?: string,
  ) => {
    if (!constitution || !logtoId) return;

    // Validate parent requirements
    if (type === "section" && !parentId) return;
    if (type === "subsection" && !parentId) return;

    const existingSections = sections || [];

    // Compute order scoped to siblings (same parentId), not global
    const siblings = existingSections.filter((s) =>
      parentId ? s.parentId === parentId : !s.parentId,
    );
    const newOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((s) => s.order)) + 1
        : 1;

    let articleNumber: number | undefined;
    let sectionNumber: number | undefined;
    let amendmentNumber: number | undefined;

    const existingArticles = existingSections.filter((s) => s.type === "article");
    const existingAmendments = existingSections.filter(
      (s) => s.type === "amendment",
    );

    switch (type) {
      case "article":
        articleNumber = existingArticles.length + 1;
        break;
      case "section":
        if (parentId) {
          const parentSections = existingSections.filter(
            (s) => s.parentId === parentId && s.type === "section",
          );
          sectionNumber = parentSections.length + 1;
        }
        break;
      case "amendment":
        amendmentNumber = existingAmendments.length + 1;
        break;
    }

    await addSection({
      logtoId,
      constitutionId: constitution._id,
      type,
      title,
      content,
      parentId,
      articleNumber,
      sectionNumber,
      amendmentNumber,
      order: newOrder,
    });
  };

  const handleUpdateSection = async (
    sectionId: string,
    updates: Partial<ConstitutionSection>,
  ) => {
    if (!constitution || !logtoId) return;

    await updateSection({
      logtoId,
      constitutionId: constitution._id,
      sectionId,
      title: updates.title,
      content: updates.content,
      order: updates.order,
      parentId: updates.parentId,
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!constitution || !logtoId) return;

    await deleteSection({
      logtoId,
      constitutionId: constitution._id,
      sectionId,
    });
  };

  const handleReorderSection = async (
    sectionId: string,
    newOrder: number,
  ) => {
    if (!constitution || !logtoId) return;

    await reorderSection({
      logtoId,
      constitutionId: constitution._id,
      sectionId,
      newOrder,
    });
  };

  const initializeConstitution = useCallback(async () => {
    if (!isAuthenticated || !logtoId || ensuringDefault) return;
    if (constitution) {
      setInitialized(true);
      return;
    }
    setEnsuringDefault(true);
    try {
      await ensureConstitution({ logtoId });
      setInitialized(true);
    } finally {
      setEnsuringDefault(false);
    }
  }, [isAuthenticated, logtoId, ensuringDefault, constitution, ensureConstitution]);

  const handleSaveDocumentSections = useCallback(async (
    parsedSections: ConstitutionDocumentSectionInput[],
  ): Promise<ConstitutionDocumentSaveResult> => {
    if (!constitution || !logtoId) {
      return {
        created: 0,
        updated: 0,
        deleted: 0,
        reordered: 0,
        total: 0,
      };
    }

    return await syncDocumentSections({
      logtoId,
      constitutionId: constitution._id,
      sections: parsedSections,
    });
  }, [constitution, logtoId, syncDocumentSections]);

  return {
    constitution,
    sections: sections || [],
    isLoading,
    saveStatus,
    addSection: handleAddSection,
    updateSection: handleUpdateSection,
    deleteSection: handleDeleteSection,
    reorderSection: handleReorderSection,
    saveDocumentSections: handleSaveDocumentSections,
    initializeConstitution,
    constitutionId: constitution?._id,
  };
}
