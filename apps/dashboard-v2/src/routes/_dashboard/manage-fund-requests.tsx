import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/manage-fund-requests")({
  component: ManageFundRequestsPage,
});

function ManageFundRequestsPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const requests = useQuery(api.fundRequests.listAll, logtoId ? { logtoId } : "skip");
  const updateStatus = useMutation(api.fundRequests.updateStatus);

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Fund Requests</h1>
        <p className="text-muted-foreground">Review and approve fund requests.</p>
      </div>
      {!requests ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r._id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-sm text-muted-foreground">${r.amount.toFixed(2)} &middot; {r.description}</p>
                </div>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
              {r.status === "submitted" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => { try { await updateStatus({ logtoId: logtoId!, id: r._id, status: "approved" }); toast.success("Approved"); } catch { toast.error("Failed"); } }}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={async () => { try { await updateStatus({ logtoId: logtoId!, id: r._id, status: "declined" }); toast.success("Declined"); } catch { toast.error("Failed"); } }}>Decline</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">No fund requests.</p>
      )}
    </div>
  );
}
