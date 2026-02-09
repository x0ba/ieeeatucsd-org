import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_dashboard/constitution-builder")({
  component: ConstitutionBuilderPage,
});

function ConstitutionBuilderPage() {
  const { hasAdminAccess } = usePermissions();

  if (!hasAdminAccess) {
    return <div className="p-6 text-center text-muted-foreground">You don't have permission to access this page.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Constitution Builder</h1>
        <p className="text-muted-foreground">Edit and manage the IEEE UCSD constitution.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p>Constitution builder coming soon.</p>
      </div>
    </div>
  );
}
