import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_dashboard/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const invitations = useQuery(api.officerInvitations.list, logtoId ? { logtoId } : "skip");

  if (!hasAdminAccess) {
    return <div className="p-6 text-center text-muted-foreground">You don't have permission to access this page.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
        <p className="text-muted-foreground">Manage officer invitations and onboarding.</p>
      </div>
      {!invitations ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : invitations.length > 0 ? (
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div key={inv._id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{inv.name}</p>
                <p className="text-sm text-muted-foreground">{inv.email} &middot; {inv.position}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{inv.role}</Badge>
                <Badge variant={inv.status === "accepted" ? "default" : "secondary"}>{inv.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No invitations sent.</p>
      )}
    </div>
  );
}
