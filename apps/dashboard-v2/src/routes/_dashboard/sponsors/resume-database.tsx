import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_dashboard/sponsors/resume-database")({
  component: ResumeDatabasePage,
});

function ResumeDatabasePage() {
  const { isSponsor, canAccessResumeDatabase, isAdmin } = usePermissions();

  if (!isSponsor && !isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">You don't have permission to access this page.</div>;
  }

  if (!canAccessResumeDatabase) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-lg font-medium">Resume Database Access</p>
        <p className="mt-2">Your current sponsor tier does not include resume database access. Please upgrade to Silver or higher.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resume Database</h1>
        <p className="text-muted-foreground">Browse and download member resumes.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p>Resume database coming soon.</p>
      </div>
    </div>
  );
}
