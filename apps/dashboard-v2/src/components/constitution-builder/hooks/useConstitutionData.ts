import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ConstitutionSection,
  SaveStatus,
} from "../types";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

export function useConstitutionData() {
  const { isAuthenticated, logtoId } = useAuth();
  const [initialized, setInitialized] = useState(false);

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

  const isLoading = constitution === undefined || (!initialized && isAuthenticated && logtoId);
  const saveStatus: SaveStatus = isLoading ? "idle" : "saved";

  // Auto-initialize constitution when authenticated
  useEffect(() => {
    if (isAuthenticated && logtoId && !initialized && constitution === undefined) {
      ensureConstitution({ logtoId }).then(() => setInitialized(true));
    }
  }, [isAuthenticated, logtoId, initialized, constitution, ensureConstitution]);

  const handleAddSection = async (
    type: ConstitutionSection["type"],
    parentId?: string,
    title?: string,
    content?: string,
  ) => {
    if (!constitution || !logtoId) return;

    const existingSections = sections || [];
    const newOrder =
      existingSections.length > 0
        ? Math.max(...existingSections.map((s) => s.order)) + 1
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

  const initializeConstitution = async () => {
    if (!isAuthenticated || !logtoId) return;
    await ensureConstitution({ logtoId });
    setInitialized(true);
  };

  return {
    constitution,
    sections: sections || [],
    isLoading,
    saveStatus,
    addSection: handleAddSection,
    updateSection: handleUpdateSection,
    deleteSection: handleDeleteSection,
    reorderSection: handleReorderSection,
    initializeConstitution,
    constitutionId: constitution?._id,
  };
}
