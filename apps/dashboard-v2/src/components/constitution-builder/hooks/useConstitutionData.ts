import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  ConstitutionSection,
  SaveStatus,
} from "../types";

const CONSTITUTION_ID = "ieee-ucsd-constitution";

export function useConstitutionData() {
  const { isAuthenticated } = useConvexAuth();

  // Get or ensure constitution exists
  const constitution = useQuery(api.constitutions.getDefault, {
    logtoId: "",
  });
  const ensureConstitution = useMutation(api.constitutions.ensureDefaultConstitution);

  // Get sections
  const sections = useQuery(api.constitutions.getSections, {
    constitutionId: CONSTITUTION_ID as any,
  });

  // Mutations
  const addSection = useMutation(api.constitutions.addSection);
  const updateSection = useMutation(api.constitutions.updateSection);
  const deleteSection = useMutation(api.constitutions.deleteSection);
  const reorderSection = useMutation(api.constitutions.reorderSection);

  const isLoading = constitution === undefined;
  const saveStatus: SaveStatus = isLoading ? "idle" : "saved";

  const handleAddSection = async (
    type: ConstitutionSection["type"],
    parentId?: string,
    title?: string,
    content?: string,
  ) => {
    if (!constitution) return;

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
      logtoId: "",
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
    if (!constitution) return;

    await updateSection({
      logtoId: "",
      constitutionId: constitution._id,
      sectionId,
      title: updates.title,
      content: updates.content,
      order: updates.order,
      parentId: updates.parentId,
    });
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!constitution) return;

    await deleteSection({
      logtoId: "",
      constitutionId: constitution._id,
      sectionId,
    });
  };

  const handleReorderSection = async (
    sectionId: string,
    newOrder: number,
  ) => {
    if (!constitution) return;

    await reorderSection({
      logtoId: "",
      constitutionId: constitution._id,
      sectionId,
      newOrder,
    });
  };

  const initializeConstitution = async () => {
    if (!isAuthenticated) return;
    await ensureConstitution({ logtoId: "" });
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
    constitutionId: CONSTITUTION_ID,
  };
}
