import { useState, useCallback } from "react";
import { useAuth } from "../../../../shared/hooks/useConvexAuth";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type {
  ConstitutionAuditEntry,
  ConstitutionSection,
} from "../../shared/types/constitution";

export const useConstitutionAudit = (constitutionId: string) => {
  const { authUserId, user } = useAuth();
  
  // Query audit logs from Convex
  const auditLogs = useQuery(api.constitutions.getAuditLogs, { constitutionId }) || [];
  
  // Mutations
  const createAuditLogMutation = useMutation(api.constitutions.createAuditLog);

  // Transform Convex audit logs to match expected format
  const auditEntries: ConstitutionAuditEntry[] = auditLogs.map((log) => ({
    id: log._id,
    constitutionId: log.constitutionId,
    sectionId: log.sectionId,
    changeType: log.action,
    changeDescription: generateChangeDescription(log.action, log.beforeState, log.afterState),
    beforeValue: log.beforeState,
    afterValue: log.afterState,
    userId: log.performedBy,
    userName: user?.name || "Unknown User", // Could be enhanced with user lookup
    timestamp: log.timestamp,
    ipAddress: "Not tracked",
    userAgent: navigator.userAgent,
  }));

  const isLoading = auditLogs === undefined;

  // Generate human-readable change description
  const generateChangeDescription = useCallback(
    (
      changeType: "create" | "update" | "delete",
      beforeValue?: any,
      afterValue?: any,
    ): string => {
      // Helper to get display name for section type
      const getDisplayName = (value: any) => {
        if (!value) return "section";

        switch (value.type) {
          case "preamble":
            return "Preamble";
          case "article":
            return value.articleNumber
              ? `Article ${value.articleNumber}`
              : "Article";
          case "section":
            return value.sectionNumber
              ? `Section ${value.sectionNumber}`
              : "Section";
          case "subsection":
            return value.subsectionLetter
              ? `Subsection ${value.subsectionLetter}`
              : "Subsection";
          case "amendment":
            return value.amendmentNumber
              ? `Amendment ${value.amendmentNumber}`
              : "Amendment";
          default:
            return value.type || "section";
        }
      };

      switch (changeType) {
        case "create":
          const displayName = getDisplayName(afterValue);
          if (afterValue?.title) {
            return `Created ${displayName}: "${afterValue.title}"`;
          }
          return `Created ${displayName}`;

        case "delete":
          const deletedDisplayName = getDisplayName(beforeValue);
          if (beforeValue?.title) {
            return `Deleted ${deletedDisplayName}: "${beforeValue.title}"`;
          }
          return `Deleted ${deletedDisplayName}`;

        case "update":
          const updatedDisplayName = getDisplayName(afterValue || beforeValue);
          const changes: string[] = [];

          if (beforeValue?.title !== afterValue?.title) {
            if (!beforeValue?.title && afterValue?.title) {
              changes.push(`added title "${afterValue.title}"`);
            } else if (beforeValue?.title && !afterValue?.title) {
              changes.push(`removed title "${beforeValue.title}"`);
            } else {
              changes.push(
                `changed title from "${beforeValue?.title || ""}" to "${afterValue?.title || ""}"`,
              );
            }
          }

          if (beforeValue?.content !== afterValue?.content) {
            const beforeLength = beforeValue?.content?.length || 0;
            const afterLength = afterValue?.content?.length || 0;

            if (beforeLength === 0 && afterLength > 0) {
              changes.push(`added content (${afterLength} characters)`);
            } else if (beforeLength > 0 && afterLength === 0) {
              changes.push(
                `removed all content (was ${beforeLength} characters)`,
              );
            } else {
              const diff = afterLength - beforeLength;
              const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
              changes.push(
                `modified content (${beforeLength} → ${afterLength} characters, ${diffStr})`,
              );
            }
          }

          if (beforeValue?.type !== afterValue?.type) {
            changes.push(
              `changed type from "${beforeValue?.type || ""}" to "${afterValue?.type || ""}"`,
            );
          }

          if (beforeValue?.order !== afterValue?.order) {
            changes.push(
              `changed position from ${beforeValue?.order || 0} to ${afterValue?.order || 0}`,
            );
          }

          if (changes.length > 0) {
            return `Updated ${updatedDisplayName}: ${changes.join(", ")}`;
          }
          return `Updated ${updatedDisplayName}`;

        default:
          return "Unknown change";
      }
    },
    [],
  );

  // Create audit entry
  const createAuditEntry = useCallback(
    async (
      changeType: ConstitutionAuditEntry["changeType"],
      sectionId?: string,
      beforeValue?: ConstitutionSection,
      afterValue?: ConstitutionSection | Partial<ConstitutionSection>,
    ) => {
      if (!authUserId) return;

      try {
        const userName = user?.name || "Unknown User";

        // Convert full section objects to audit format, filtering out undefined values
        const beforeAuditValue = beforeValue
          ? Object.fromEntries(
              Object.entries({
                title: beforeValue.title,
                content: beforeValue.content,
                type: beforeValue.type,
                order: beforeValue.order,
                parentId: beforeValue.parentId,
                articleNumber: beforeValue.articleNumber,
                sectionNumber: beforeValue.sectionNumber,
                subsectionLetter: beforeValue.subsectionLetter,
                amendmentNumber: beforeValue.amendmentNumber,
              }).filter(([_, value]) => value !== undefined),
            )
          : undefined;

        const afterAuditValue = afterValue
          ? Object.fromEntries(
              Object.entries({
                title: afterValue.title,
                content: afterValue.content,
                type: afterValue.type,
                order: afterValue.order,
                parentId: afterValue.parentId,
                articleNumber: afterValue.articleNumber,
                sectionNumber: afterValue.sectionNumber,
                subsectionLetter: afterValue.subsectionLetter,
                amendmentNumber: afterValue.amendmentNumber,
              }).filter(([_, value]) => value !== undefined),
            )
          : undefined;

        await createAuditLogMutation({
          constitutionId,
          action: changeType,
          sectionId: sectionId || "",
          beforeState: beforeAuditValue,
          afterState: afterAuditValue,
          performedBy: authUserId,
        });
      } catch (error) {
        console.error("Error creating audit entry:", error);
      }
    },
    [authUserId, user, constitutionId, createAuditLogMutation],
  );

  return {
    auditEntries,
    isLoading,
    createAuditEntry,
  };
};
