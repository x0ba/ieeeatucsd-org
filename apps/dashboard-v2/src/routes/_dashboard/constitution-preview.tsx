import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import ConstitutionPreview from "@/components/constitution-builder/ConstitutionPreview";
import { exportConstitutionToPdf } from "@/components/constitution-builder/utils/pdfExport";

export const Route = createFileRoute("/_dashboard/constitution-preview")({
  component: ConstitutionPreviewPage,
});

function ConstitutionPreviewPage() {
  const { hasOfficerAccess } = usePermissions();
  const { logtoId } = useAuth();

  const constitution = useQuery(
    api.constitutions.getDefault,
    logtoId ? { logtoId } : "skip",
  );

  const sections = useQuery(
    api.constitutions.getSections,
    constitution ? { constitutionId: constitution._id } : "skip",
  );

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  if (constitution === undefined || sections === undefined) {
    return (
      <div className="w-full p-6">
        <div className="max-w-[8.5in] mx-auto space-y-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
          <div className="h-[11in] bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    exportConstitutionToPdf(constitution, sections);
  };

  return (
    <div className="w-full p-4 md:p-6">
      <div className="max-w-[8.5in] mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-auto">
          <ConstitutionPreview
            constitution={constitution}
            sections={sections}
            onPrint={handlePrint}
          />
        </div>
      </div>
    </div>
  );
}
