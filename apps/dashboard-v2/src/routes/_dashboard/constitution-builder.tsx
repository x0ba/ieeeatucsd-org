import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";
import ConstitutionBuilderContent from "@/components/constitution-builder/ConstitutionBuilderContent";

export const Route = createFileRoute("/_dashboard/constitution-builder")({
  component: ConstitutionBuilderPage,
});

function ConstitutionBuilderPage() {
  const { hasAdminAccess } = usePermissions();

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return <ConstitutionBuilderContent />;
}
