import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_dashboard/fund-requests")({
  component: FundRequestsPage,
});

function FundRequestsPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const requests = useQuery(api.fundRequests.listMine, logtoId ? { logtoId } : "skip");

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
        <h1 className="text-2xl font-bold tracking-tight">Fund Requests</h1>
        <p className="text-muted-foreground">Submit and track fund requests.</p>
      </div>
      {!requests ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r._id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.title}</p>
                <p className="text-sm text-muted-foreground">${r.amount.toFixed(2)}</p>
              </div>
              <Badge variant="secondary">{r.status}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No fund requests.</p>
      )}
    </div>
  );
}
