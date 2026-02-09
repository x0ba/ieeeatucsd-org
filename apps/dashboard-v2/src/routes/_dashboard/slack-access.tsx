import { createFileRoute } from "@tanstack/react-router";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/_dashboard/slack-access")({
  component: SlackAccessPage,
});

function SlackAccessPage() {
  const { hasOfficerAccess } = usePermissions();

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Slack Access</h1>
        <p className="text-muted-foreground">Manage IEEE email accounts for Slack access.</p>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p>IEEE email management will be available here.</p>
        <p className="text-sm mt-2">Create, manage, and reset IEEE email accounts via MXRoute.</p>
      </div>
    </div>
  );
}
